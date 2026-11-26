/* Site editor (Western Tennis Club): typography + on-page text editing. Floating "Aa" button opens a panel that edits fonts, sizes and spacing live.
   Settings are saved in this browser (localStorage). "Copy CSS" copies the current settings so they can be made permanent
   by pasting into the :root block of the stylesheet. */
(function () {
  if (window.__wtcType) return; window.__wtcType = 1;
  var HEAD = ["Playfair Display", "Bodoni Moda", "Cormorant Garamond", "DM Serif Display", "Instrument Serif", "Libre Caslon Display", "Inter Tight", "Manrope"];
  var BODY = ["Inter Tight", "Inter", "Manrope", "DM Sans", "Cormorant Garamond", "Playfair Display"];
  var CTRL = [
    { k: "--font-head", label: "Heading font", type: "font", list: HEAD },
    { k: "--font-body", label: "Body font", type: "font", list: BODY },
    { k: "--h1-size", label: "Title size", min: 36, max: 160, step: 1, unit: "px" },
    { k: "--h1-weight", label: "Title weight", min: 300, max: 900, step: 100, unit: "" },
    { k: "--h1-ls", label: "Title letter spacing", min: -0.08, max: 0.1, step: 0.005, unit: "em" },
    { k: "--h1-lh", label: "Title line height", min: 0.75, max: 1.4, step: 0.01, unit: "" },
    { k: "--h1-style", label: "Title italic", type: "toggle", on: "italic", off: "normal" },
    { k: "--h2-size", label: "Section heading size", min: 16, max: 60, step: 1, unit: "px" },
    { k: "--h2-weight", label: "Section heading weight", min: 300, max: 900, step: 100, unit: "" },
    { k: "--lede-size", label: "Intro text size", min: 12, max: 28, step: 1, unit: "px" },
    { k: "--body-size", label: "Body text size", min: 12, max: 20, step: 0.5, unit: "px" },
    { k: "--body-lh", label: "Body line height", min: 1.1, max: 2, step: 0.05, unit: "" },
    { k: "--title-gap", label: "Space under title", min: 0, max: 80, step: 1, unit: "px" }
  ];
  var KEY = "wtc-type-v1", root = document.documentElement;
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  var state = load();
  function cur(k) { return state[k] != null ? state[k] : getComputedStyle(root).getPropertyValue(k).trim(); }
  function apply() {
    CTRL.forEach(function (c) { if (state[c.k] != null) root.style.setProperty(c.k, c.type === "font" ? "'" + state[c.k] + "'" : state[c.k]); else root.style.removeProperty(c.k); });
    window.dispatchEvent(new CustomEvent("wtc-type"));
  }
  apply();
  function strip(v) { return String(v).replace(/^['"]|['"].*$/g, ""); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  // ---------- text editing ----------
  var TKEY = "wtc-text-v1", editing = false;
  var SEL = "h1,h2,h3,p,.lede,.label,.notice div,.logo,nav li a";
  function tload() { try { return JSON.parse(localStorage.getItem(TKEY) || "{}"); } catch (e) { return {}; } }
  function tsave(o) { try { localStorage.setItem(TKEY, JSON.stringify(o)); } catch (e) {} }
  var texts = tload();
  function pageId(el) { var s = el.closest && el.closest("section.page"); return s ? "#" + s.id : el.closest("nav") ? "nav" : location.pathname.replace(/\/$/, "") || "/"; }
  function editables() {
    var all = Array.prototype.slice.call(document.querySelectorAll(SEL)), counts = {}, out = [];
    all.forEach(function (el) {
      if (el.closest(".wtc-te,.gate,.gf-root,#carousel,#budget-root,#balance-root,table,.wtc-te-btn")) return;
      if (el.querySelector(SEL)) return; // innermost only
      var pid = pageId(el), n = counts[pid] = (counts[pid] || 0) + 1;
      out.push({ el: el, key: pid + "|" + el.tagName + "|" + n });
    });
    return out;
  }
  function applyTexts() { editables().forEach(function (o) { if (texts[o.key] != null && o.el.innerHTML !== texts[o.key]) o.el.innerHTML = texts[o.key]; }); }
  function setEditing(on) {
    editing = on; document.documentElement.classList.toggle("wtc-editing", on);
    editables().forEach(function (o) {
      if (on) { o.el.setAttribute("contenteditable", "true"); o.el.oninput = function () { texts[o.key] = o.el.innerHTML; tsave(texts); }; }
      else { o.el.removeAttribute("contenteditable"); o.el.oninput = null; }
    });
  }
  // links shouldn't navigate while editing
  document.addEventListener("click", function (e) { if (editing && e.target.closest && e.target.closest("[contenteditable] , a[contenteditable]")) e.preventDefault(); }, true);
  var lastLoc = "";
  setInterval(function () { var l = location.pathname + location.hash; if (l !== lastLoc) { lastLoc = l; setTimeout(function () { applyTexts(); if (editing) setEditing(true); }, 60); } }, 400);
  if (document.readyState !== "loading") setTimeout(applyTexts, 0); else addEventListener("DOMContentLoaded", function () { setTimeout(applyTexts, 0); });
  function isSingleFile() { return !!document.querySelector("section.page"); }
  function downloadHtml() {
    var was = editing; if (was) setEditing(false);
    var doc = document.documentElement.cloneNode(true);
    ["#carousel", "#budget-root", "#balance-root"].forEach(function (q) { var n = doc.querySelector(q); if (n) n.innerHTML = ""; });
    doc.querySelectorAll(".wtc-te,.wtc-te-btn,.gate,style[data-wtc-te],body>canvas[aria-hidden]").forEach(function (n) { n.remove(); });
    doc.querySelectorAll("section.page").forEach(function (n) { n.classList.remove("show", "locked"); });
    doc.querySelector("body").classList.remove("home-bg");
    doc.classList.remove("wtc-editing");
    var html = "<!doctype html>\n" + doc.outerHTML;
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([html], { type: "text/html" })); a.download = "western-tennis-club.html";
    document.body.appendChild(a); a.click(); a.remove();
    if (was) setEditing(true);
  }

  function build() {
    var css = ".wtc-te-btn{position:fixed;right:16px;bottom:16px;z-index:50;width:48px;height:48px;border-radius:50%;border:0;background:#111;color:#fff;font:600 18px/1 Georgia,serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}" +
      ".wtc-te{position:fixed;right:16px;bottom:76px;z-index:50;width:min(340px,calc(100vw - 32px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;color:#111;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:18px;font:13px/1.4 system-ui,sans-serif}" +
      ".wtc-te h4{margin:0 0 12px;font:700 15px system-ui,sans-serif}.wtc-te label{display:block;margin:0 0 12px}.wtc-te .r{display:flex;justify-content:space-between;color:#555;margin-bottom:4px}" +
      ".wtc-te input[type=range],.wtc-te select{width:100%}.wtc-te select{padding:6px;border-radius:8px;border:1px solid #ddd;font:inherit}" +
      ".wtc-te .row{display:flex;gap:8px;margin-top:8px}.wtc-te button.b{flex:1;padding:9px;border-radius:999px;border:1px solid #ddd;background:#fff;cursor:pointer;font:600 13px system-ui}.wtc-te button.b.p{background:#E8D84A;border-color:#E8D84A}" +
      ".wtc-te .note{color:#888;font-size:12px;margin-top:8px}.wtc-te hr{border:0;border-top:1px solid #eee;margin:16px 0}" +
      "html.wtc-editing [contenteditable]{outline:1.5px dashed rgba(47,111,214,.55);outline-offset:3px;border-radius:4px;cursor:text}html.wtc-editing [contenteditable]:focus{outline:2px solid #2F6FD6;background:rgba(255,255,255,.08)}";
    var st = document.createElement("style"); st.setAttribute("data-wtc-te", ""); st.textContent = css; document.head.appendChild(st);
    var btn = document.createElement("button"); btn.className = "wtc-te-btn"; btn.textContent = "Aa"; btn.title = "Site editor"; btn.setAttribute("aria-label", "Open site editor");
    var p = document.createElement("div"); p.className = "wtc-te"; p.hidden = true;
    function render() {
      p.innerHTML = "<h4>Text</h4>";
      var trow = document.createElement("div"); trow.className = "row";
      var tbtn = document.createElement("button"); tbtn.className = "b" + (editing ? " p" : ""); tbtn.textContent = editing ? "Done editing" : "Edit text on page";
      tbtn.onclick = function () { setEditing(!editing); render(); };
      var treset = document.createElement("button"); treset.className = "b"; treset.textContent = "Reset text";
      treset.onclick = function () { texts = {}; tsave(texts); location.reload(); };
      trow.appendChild(tbtn); trow.appendChild(treset); p.appendChild(trow);
      var tn = document.createElement("div"); tn.className = "note"; tn.textContent = editing ? "Click any heading or paragraph and type. Changes save automatically." : "Turn on, then click any heading or paragraph to change it.";
      p.appendChild(tn);
      p.appendChild(document.createElement("hr"));
      var h = document.createElement("h4"); h.textContent = "Typography"; p.appendChild(h);
      CTRL.forEach(function (c) {
        var l = document.createElement("label"), v = cur(c.k), out;
        if (c.type === "font") {
          l.innerHTML = '<div class="r"><span>' + c.label + "</span></div>";
          var s = document.createElement("select");
          c.list.forEach(function (f) { var o = document.createElement("option"); o.value = f; o.textContent = f; o.style.fontFamily = "'" + f + "'"; s.appendChild(o); });
          s.value = strip(v); s.onchange = function () { state[c.k] = s.value; save(state); apply(); }; l.appendChild(s);
        } else if (c.type === "toggle") {
          var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = v === c.on;
          cb.onchange = function () { state[c.k] = cb.checked ? c.on : c.off; save(state); apply(); };
          l.innerHTML = '<div class="r"><span>' + c.label + "</span></div>"; l.firstChild.appendChild(cb);
        } else {
          var r = document.createElement("input"); r.type = "range"; r.min = c.min; r.max = c.max; r.step = c.step;
          var start = num(v); if (c.k === "--h1-size" && !/px$/.test(v)) start = parseFloat(getComputedStyle(document.querySelector("h1") || root).fontSize) || 96;
          r.value = start;
          l.innerHTML = '<div class="r"><span>' + c.label + "</span><b></b></div>"; out = l.querySelector("b"); out.textContent = start + c.unit;
          r.oninput = function () { state[c.k] = r.value + c.unit; out.textContent = r.value + c.unit; save(state); apply(); };
          l.appendChild(r);
        }
        p.appendChild(l);
      });
      var row = document.createElement("div"); row.className = "row";
      var copy = document.createElement("button"); copy.className = "b p"; copy.textContent = "Copy CSS";
      copy.onclick = function () {
        var txt = ":root{\n" + CTRL.map(function (c) { var v = state[c.k] != null ? state[c.k] : cur(c.k); return "  " + c.k + ": " + (c.type === "font" ? "'" + strip(v) + "'" : v) + ";"; }).join("\n") + "\n}";
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { copy.textContent = "Copied"; }, function () { window.prompt("Copy this CSS", txt); });
        setTimeout(function () { copy.textContent = "Copy CSS"; }, 1500);
      };
      var reset = document.createElement("button"); reset.className = "b"; reset.textContent = "Reset fonts";
      reset.onclick = function () { state = {}; save(state); apply(); render(); };
      row.appendChild(copy); row.appendChild(reset); p.appendChild(row);
      p.appendChild(document.createElement("hr"));
      var row2 = document.createElement("div"); row2.className = "row";
      var copyAll = document.createElement("button"); copyAll.className = "b"; copyAll.textContent = "Copy all changes";
      copyAll.onclick = function () {
        var txt = JSON.stringify({ type: state, text: texts }, null, 2);
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { copyAll.textContent = "Copied"; }, function () { window.prompt("Copy this", txt); });
        setTimeout(function () { copyAll.textContent = "Copy all changes"; }, 1500);
      };
      row2.appendChild(copyAll);
      if (isSingleFile()) { var dl = document.createElement("button"); dl.className = "b p"; dl.textContent = "Download HTML"; dl.onclick = downloadHtml; row2.appendChild(dl); }
      p.appendChild(row2);
      var n = document.createElement("div"); n.className = "note"; n.textContent = isSingleFile() ? "Changes save in this browser. Download HTML saves a new file with your text and fonts built in." : "Changes save in this browser only. Use Copy all changes and send it over to make them permanent."; p.appendChild(n);
    }
    btn.onclick = function () { p.hidden = !p.hidden; if (!p.hidden) render(); };
    document.body.appendChild(p); document.body.appendChild(btn);
  }
  if (document.body) build(); else addEventListener("DOMContentLoaded", build);
})();
