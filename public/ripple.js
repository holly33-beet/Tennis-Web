/* Water ripple on every page (Western Tennis Club).
   Pages with a background image: refracts it. Pages without: a transparent light-and-shade ripple over the content.
   Original, dependency-free: CPU wave simulation on a coarse grid + WebGL refraction of the court painting.
   Light is a faint transparent sheen so the painting stays visible. Reads the image from body.home-bg's CSS background. */
(function () {
  if (window.__wtcRipple) return; window.__wtcRipple = 1;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var CELL = 7, DAMP = 0.982, STRENGTH = 0.022, LIGHT = 0.35;
  var cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:none";
  var gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) return;
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0,1);}"));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, [
    "precision mediump float;varying vec2 v;uniform sampler2D img,hm;uniform vec2 px,scr,isz;uniform float st,lt,ov;",
    "float H(vec2 u){return texture2D(hm,u).r-.5;}",
    "void main(){",
    " float dx=H(v+vec2(px.x,0.))-H(v-vec2(px.x,0.));float dy=H(v+vec2(0.,px.y))-H(v-vec2(0.,px.y));",
    " if(ov>.5){vec3 n=normalize(vec3(-dx*6.,-dy*6.,1.));float sh=dot(n,normalize(vec3(-.4,-.6,1.)))-.8111;",
    "  float sp=pow(max(dot(n,normalize(vec3(-.4,-.6,1.))),0.),40.);float a=clamp(abs(sh)*.7+sp*.25,0.,.18);",
    "  vec3 c=sh>0.?vec3(1.):vec3(.42,.58,.82);gl_FragColor=vec4(c,a);return;}",
    " vec2 u=v+vec2(dx,dy)*st*8.;",
    // background-size:cover; background-position:center top
    " float s=max(scr.x/isz.x,scr.y/isz.y);vec2 d=isz*s;vec2 q=(u*scr-vec2((scr.x-d.x)*.5,0.))/d;",
    " vec3 c=texture2D(img,clamp(q,0.,1.)).rgb;",
    " vec3 n=normalize(vec3(-dx*6.,-dy*6.,1.));float sp=pow(max(dot(n,normalize(vec3(-.4,-.6,1.))),0.),40.);",
    " float edge=clamp(abs(dx)+abs(dy),0.,1.);",
    " c+=vec3(1.)*(sp*.55+edge*.6)*lt;",
    " gl_FragColor=vec4(c,1.);}"].join("\n")));
  gl.linkProgram(prog); gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  function tex(unit) { var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
  var imgTex = tex(0), hmTex = tex(1);
  var U = function (n) { return gl.getUniformLocation(prog, n); };
  gl.uniform1i(U("img"), 0); gl.uniform1i(U("hm"), 1); gl.uniform1f(U("st"), STRENGTH); gl.uniform1f(U("lt"), LIGHT);
  var img = new Image(), ready = false, imgSrc = "";
  img.onload = function () { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, imgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.uniform2f(U("isz"), img.width, img.height); ready = true; draw(); };
  var W, Hh, cols, rows, a, b, bytes;
  function resize() {
    var dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; Hh = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
    gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(U("scr"), W, Hh);
    cols = Math.min(280, Math.ceil(W / CELL)); rows = Math.ceil(cols * Hh / W);
    a = new Float32Array(cols * rows); b = new Float32Array(cols * rows); bytes = new Uint8Array(cols * rows * 4);
    gl.uniform2f(U("px"), 1 / cols, 1 / rows); draw();
  }
  function home() { var b = getComputedStyle(document.body).backgroundImage; return !!b && b !== "none"; }
  function on() { return true; }
  function poke(x, y, amt) {
    var cx = x / W * cols, cy = y / Hh * rows, r = 2.2;
    for (var j = Math.floor(cy - r); j <= cy + r; j++) for (var i = Math.floor(cx - r); i <= cx + r; i++) {
      if (i < 1 || j < 1 || i >= cols - 1 || j >= rows - 1) continue;
      var d = Math.hypot(i - cx, j - cy); if (d < r) a[j * cols + i] += amt * (Math.cos(d / r * Math.PI) + 1) * .5;
    }
  }
  var last = null, energy = 0, running = false;
  function step() {
    energy = 0;
    for (var j = 1; j < rows - 1; j++) for (var i = 1, k = j * cols + 1; i < cols - 1; i++, k++) {
      var n = ((a[k - 1] + a[k + 1] + a[k - cols] + a[k + cols]) * .5 - b[k]) * DAMP;
      b[k] = n; energy += n < 0 ? -n : n;
    }
    var t = a; a = b; b = t;
  }
  function draw() {
    if (!a || (home() && !ready)) return;
    gl.uniform1f(U("ov"), home() ? 0 : 1);
    for (var k = 0, m = a.length; k < m; k++) { var v = 128 + a[k] * 90; v = v < 0 ? 0 : v > 255 ? 255 : v; bytes[k * 4] = v; }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, hmTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop() {
    if (!on()) { running = false; return; }
    step(); draw();
    if (energy < 0.02 * cols) { running = false; return; }
    requestAnimationFrame(loop);
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
  function sync() {
    var h = home();
    if (h) {
      var m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(document.body).backgroundImage || "");
      if (m && m[1] !== imgSrc) { imgSrc = m[1]; img.src = imgSrc; }
    }
    // home: behind the content, refracting the painting; elsewhere: a see-through layer above the content
    cv.style.zIndex = h ? "-1" : "30";
    cv.style.display = h && !ready ? "none" : "block";
    draw();
  }
  img.addEventListener("load", sync);
  addEventListener("pointermove", function (e) {
    if (!on() || !a) return;
    var p = { x: e.clientX, y: e.clientY };
    if (last) { var dx = p.x - last.x, dy = p.y - last.y, dist = Math.hypot(dx, dy), steps = Math.min(12, Math.ceil(dist / CELL));
      for (var s = 1; s <= steps; s++) poke(last.x + dx * s / steps, last.y + dy * s / steps, Math.min(1.2, .25 + dist / 60) / steps * 2); }
    last = p; kick();
  }, { passive: true });
  addEventListener("pointerleave", function () { last = null; });
  addEventListener("pointerdown", function (e) { if (on() && a) { poke(e.clientX, e.clientY, 3); kick(); } }, { passive: true });
  addEventListener("resize", resize);
  function init() { document.body.prepend(cv); resize(); sync(); new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] }); }
  if (document.body) init(); else addEventListener("DOMContentLoaded", init);
})();
