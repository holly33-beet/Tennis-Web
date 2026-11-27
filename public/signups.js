/* Western Tennis Club: live session sign-ups (Progress page).
 * Reads the Google Form responses on page load, in the browser. Nothing is stored on a server,
 * and nobody types data in. Same file is used by the Next.js site (public/signups.js) and pasted
 * inline into western-tennis-club.html. Keep the two copies identical.
 *
 * Config (set by the page as window.WTC_SIGNUPS or passed to mount):
 *   url   : the data link. Either
 *           - the Apps Script web app URL (recommended; returns names + sessions only, all weeks), or
 *           - a "Publish to web" CSV link of the responses tab (…/pub?gid=…&single=true&output=csv).
 *   The sign-up key (the secret the Apps Script checks) is NOT in the config or the page source.
 *   Each exec types it once on the Progress page; it is kept only in that browser (localStorage).
 * Email addresses are never shown, even when the CSV contains them.
 */
(function () {
  "use strict";
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  var LIMIT = 2; // the form's rule: max 2 hours a week
  var KEY_STORE = "wtc-signup-key";
  function getKey() { try { return localStorage.getItem(KEY_STORE) || ""; } catch (e) { return ""; } }
  function setKey(k) { try { if (k) localStorage.setItem(KEY_STORE, k); else localStorage.removeItem(KEY_STORE); } catch (e) {} }
  // Cross-off ticks: saved in this browser only (localStorage), per week + session + person.
  var TICK_STORE = "wtc-signup-ticks-v1";
  function getTicks() { try { return JSON.parse(localStorage.getItem(TICK_STORE) || "{}") || {}; } catch (e) { return {}; } }
  function setTick(k, on) { var t = getTicks(); if (on) t[k] = 1; else delete t[k]; try { localStorage.setItem(TICK_STORE, JSON.stringify(t)); } catch (e) {} }
  function isScript(u) { return /script\.google(usercontent)?\.com|\/exec(\?|$)/.test(u); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // RFC 4180 CSV parser (handles quoted commas, quotes and line breaks).
  function parseCSV(text) {
    var rows = [], row = [], f = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(f); rows.push(row); row = []; f = "";
      } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  // Turn a sheet (array of rows, first row = headers) into [{name, sessions, time}].
  function rowsFromTable(table) {
    if (!table.length) return [];
    var head = table[0].map(function (h) { return String(h).toLowerCase(); });
    var iName = head.findIndex(function (h) { return h.indexOf("name") > -1 && h.indexOf("email") < 0; });
    var iSess = head.findIndex(function (h) { return h.indexOf("session") > -1 && h.indexOf("understand") < 0; });
    var iTime = head.findIndex(function (h) { return h.indexOf("timestamp") > -1; });
    if (iName < 0 || iSess < 0) throw new Error("Could not find the name and session columns in the sheet.");
    return table.slice(1).map(function (r) {
      return { name: r[iName] || "", sessions: r[iSess] || "", time: iTime > -1 ? r[iTime] || "" : "" };
    });
  }

  // "Wednesday, Nov. 4th, 9:00-10:00 PM - Beginner Clinic, Sunday, Nov. 8th, ..." -> separate sessions.
  // Commas also appear inside each option, so split only before a weekday name.
  function splitSessions(s) {
    var re = new RegExp(",\\s*(?=(?:" + DAYS.join("|") + ")\\b)", "i");
    return String(s).split(re).map(function (x) { return x.trim().replace(/,\s*$/, ""); }).filter(Boolean);
  }

  // Normalise spacing/dashes so "PM- Open Play" and "PM  - Open Play" count as the same session.
  function parseSession(raw) {
    var t = raw.replace(/\s+/g, " ").trim();
    var m = t.match(/^(\w+),\s*([A-Za-z]+)\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)?\s*-?\s*(.*)$/i);
    if (!m) return { key: t.toLowerCase(), day: "", when: t, kind: "", sort: 9e15 };
    var mon = MONTHS[m[2].toLowerCase().slice(0, 4)] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    var ap = (m[6] || "PM").toUpperCase();
    var h = parseInt(m[4], 10) % 12 + (ap === "PM" ? 12 : 0);
    var day = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    var kind = m[7].trim().replace(/^[-–\s]+/, "");
    var when = m[2].replace(/\.$/, "") + " " + parseInt(m[3], 10) + " · " + m[4] + "–" + m[5] + " " + ap;
    var sort = (mon == null ? 99 : mon) * 1e6 + parseInt(m[3], 10) * 1e4 + h * 100;
    return { key: (day + "|" + when + "|" + kind).toLowerCase(), day: day, when: when, kind: kind, sort: sort };
  }

  function normName(n) { return n.replace(/\s+/g, " ").trim(); }

  function summarise(rows) {
    var sessions = {}, people = {};
    rows.forEach(function (r) {
      var name = normName(r.name);
      if (!name || !String(r.sessions).trim()) return;
      var pk = name.toLowerCase();
      var p = people[pk] || (people[pk] = { name: name, keys: {} });
      splitSessions(r.sessions).forEach(function (raw) {
        var s = parseSession(raw);
        var slot = sessions[s.key] || (sessions[s.key] = { day: s.day, when: s.when, kind: s.kind, sort: s.sort, names: {} });
        slot.names[pk] = name;
        p.keys[s.key] = 1;
      });
    });
    var list = Object.keys(sessions).map(function (k) {
      var s = sessions[k];
      s.list = Object.keys(s.names).map(function (n) { return s.names[n]; }).sort(function (a, b) { return a.localeCompare(b); });
      return s;
    }).sort(function (a, b) { return a.sort - b.sort || a.kind.localeCompare(b.kind); });
    var ppl = Object.keys(people).map(function (k) { return { name: people[k].name, n: Object.keys(people[k].keys).length }; });
    return {
      sessions: list,
      people: ppl.length,
      spots: list.reduce(function (t, s) { return t + s.list.length; }, 0),
      over: ppl.filter(function (p) { return p.n > LIMIT; }).sort(function (a, b) { return b.n - a.n; })
    };
  }

  function weekLabel(title) {
    var m = String(title).match(/week\s*(\d+)/i);
    return m ? "Week " + m[1] : String(title).replace(/\(responses\)/i, "").trim();
  }

  function setupCard() {
    return '<div class="card ph su-empty"><div class="label">Not connected yet</div>' +
      '<p>This page fills itself from the Google Form responses once a data link is added. ' +
      'Add the Apps Script link in <code>lib/signups-config.ts</code> (Next.js site) or in the <code>WTC_SIGNUPS</code> block (single HTML file). ' +
      'Steps are in <code>SIGNUPS-SETUP.md</code>.</p></div>';
  }

  function render(el, state) {
    var cfg = state.cfg;
    if (!cfg || !cfg.url) { el.innerHTML = setupCard(); return; }
    if (state.needKey) {
      el.innerHTML = '<div class="card su-empty su-key"><div class="label">Sign-up key</div>' +
        '<p>Enter the sign-up key to load the live sign-ups. Ask Holly for it. It is saved in this browser only, never in the site’s code.</p>' +
        '<div class="su-keyrow"><input class="inp" type="password" autocomplete="off" placeholder="Sign-up key" aria-label="Sign-up key" data-su="key">' +
        '<button class="btn sm" type="button" data-su="savekey">Load sign-ups</button></div>' +
        (state.keyError ? '<p class="err-t">' + esc(state.keyError) + "</p>" : "") + "</div>";
      return;
    }
    if (state.loading && !state.weeks) { el.innerHTML = '<div class="card su-empty"><p class="small">Loading sign-ups from the Google Form…</p></div>'; return; }
    if (state.error) {
      el.innerHTML = '<div class="card su-empty"><div class="label">Could not load sign-ups</div><p>' + esc(state.error) +
        '</p><button class="btn sm" type="button" data-su="reload">Try again</button></div>';
      return;
    }
    var weeks = state.weeks || [];
    if (!weeks.length) { el.innerHTML = '<div class="card su-empty"><p class="small">No sign-up sheets found.</p></div>'; return; }
    var wi = Math.min(state.week, weeks.length - 1);
    var w = weeks[wi], s = summarise(w.rows);
    var opts = weeks.map(function (x, i) { return '<option value="' + i + '"' + (i === wi ? " selected" : "") + ">" + esc(weekLabel(x.title)) + "</option>"; }).join("");
    var h = '<div class="su-bar">' +
      (weeks.length > 1 ? '<label class="yearpick su-pick"><select data-su="week" aria-label="Week">' + opts + '</select><span class="caret">▾</span></label>' : '<span class="su-week">' + esc(weekLabel(w.title)) + "</span>") +
      '<span class="small su-time">Updated ' + esc(state.fetched.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })) + '</span>' +
      '<button class="btn sm ghost" type="button" data-su="reload">' + (state.loading ? "Refreshing…" : "Refresh") + "</button>" +
      (isScript(cfg.url) ? '<button class="btn sm ghost" type="button" data-su="forget">Forget key</button>' : "") + "</div>";
    h += '<div class="grid">' +
      '<div class="card c4"><div class="label">People signed up</div><div class="stat">' + s.people + "</div></div>" +
      '<div class="card c4"><div class="label">Spots booked</div><div class="stat">' + s.spots + '</div><div class="small">across ' + s.sessions.length + " sessions</div></div>" +
      '<div class="card c4' + (s.over.length ? " cream" : "") + '"><div class="label">Over the ' + LIMIT + '-hour limit</div><div class="stat">' + s.over.length + "</div>" +
      (s.over.length ? '<div class="small">' + s.over.map(function (p) { return esc(p.name) + " (" + p.n + ")"; }).join(", ") + "</div>" : '<div class="small">Nobody</div>') +
      "</div></div>";
    var ticks = getTicks(), wk = String(w.title).trim().toLowerCase();
    // One card per day; each session that day is a section inside it (Holly, 2026-11-27).
    var days = [], byDay = {};
    s.sessions.forEach(function (x) {
      var parts = x.when.split(" · "), date = parts.length > 1 ? parts[0] : "", dk = (x.day + "|" + date).toLowerCase();
      var d = byDay[dk] || (byDay[dk] = (days.push({ day: x.day, date: date, list: [] }), days[days.length - 1]));
      d.list.push({ x: x, time: parts.length > 1 ? parts.slice(1).join(" · ") : x.when });
    });
    h += '<div class="grid su-grid">' + days.map(function (d) {
      var ppl = {}; d.list.forEach(function (it) { it.x.list.forEach(function (n) { ppl[n.toLowerCase()] = 1; }); });
      var nPeople = Object.keys(ppl).length;
      return '<div class="card c12 su-card"><div class="su-head"><div><div class="label">' + esc(d.day || "Session") + "</div>" +
        '<div class="su-when">' + esc(d.date) + "</div></div>" +
        '<div class="su-total"><div class="stat su-n">' + nPeople + '</div><div class="small">' + (nPeople === 1 ? "person" : "people") + " this day</div></div></div>" +
        '<div class="su-sessions">' + d.list.map(function (it) {
          var x = it.x;
          return '<div class="su-sess"><div class="su-sess-head"><div><div class="su-slot">' + esc(it.time) + "</div>" +
            (x.kind ? '<span class="tag su-kind">' + esc(x.kind) + "</span>" : "") + '</div><div class="su-count">' + x.list.length + "</div></div>" +
            '<ul class="su-names">' + x.list.map(function (n) {
              var k = wk + "|" + x.day.toLowerCase() + "|" + x.when.toLowerCase() + "|" + x.kind.toLowerCase() + "|" + n.toLowerCase();
              var on = !!ticks[k];
              return '<li' + (on ? ' class="done"' : "") + '><label><input type="checkbox" data-su="tick" data-k="' + esc(k) + '"' + (on ? " checked" : "") +
                ' aria-label="Cross off ' + esc(n) + '"><span>' + esc(n) + "</span></label></li>";
            }).join("") + "</ul></div>";
        }).join("") + "</div></div>";
    }).join("") + "</div>";
    h += '<p class="small su-foot">Live from “' + esc(String(w.title).trim()) + '”. Names only; emails are never shown. Edits made in the sheet show up here on the next refresh.</p>';
    el.innerHTML = h;
  }

  function askKey(el, state, msg) { state.needKey = true; state.keyError = msg || ""; state.loading = false; render(el, state); }

  function load(el, state) {
    var u = state.cfg.url, key = getKey();
    if (isScript(u) && !key) { askKey(el, state); return; }
    state.needKey = false; state.loading = true; state.error = ""; render(el, state);
    if (key && isScript(u)) u += (u.indexOf("?") > -1 ? "&" : "?") + "token=" + encodeURIComponent(key);
    u += (u.indexOf("?") > -1 ? "&" : "?") + "_=" + Date.now(); // skip browser cache
    fetch(u, { redirect: "follow" }).then(function (r) {
      if (!r.ok) throw new Error("Google answered " + r.status + ". Check the link in the config.");
      return r.text();
    }).then(function (text) {
      var t = text.trim(), weeks;
      if (t[0] === "{") {
        var j = JSON.parse(t);
        if (j.error === "unauthorized") { setKey(""); var bad = new Error("That key is not right."); bad.badKey = true; throw bad; }
        if (j.error) throw new Error(j.error);
        weeks = j.weeks || [];
      } else if (t[0] === "<") {
        throw new Error("Got a web page instead of data. The sheet is probably not published, or the Apps Script is not deployed for “Anyone”.");
      } else {
        weeks = [{ title: state.cfg.title || "Sign-ups", rows: rowsFromTable(parseCSV(t)) }];
      }
      var first = !state.weeks;
      state.weeks = weeks; state.fetched = new Date();
      if (first) state.week = weeks.length - 1; // open on the newest week
    }).catch(function (e) {
      if (e && e.badKey) { state.weeks = null; askKey(el, state, e.message); return; }
      state.error = (e && e.message) || "Network error.";
    }).then(function () { if (!state.needKey) { state.loading = false; render(el, state); } });
  }

  function mount(el, cfg) {
    if (!el) return;
    if (el.__su) { el.__su.cfg = cfg; load(el, el.__su); return; }
    var state = el.__su = { cfg: cfg || {}, week: 0, weeks: null, loading: false, error: "", fetched: new Date(), needKey: false, keyError: "" };
    var saveKey = function () { var i = el.querySelector('[data-su="key"]'); var k = i ? i.value.trim() : ""; if (!k) return; setKey(k); load(el, state); };
    el.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-su]") : null; if (!t) return;
      if (t.dataset.su === "reload") load(el, state);
      else if (t.dataset.su === "savekey") saveKey();
      else if (t.dataset.su === "forget") { setKey(""); state.weeks = null; askKey(el, state); }
    });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.dataset && e.target.dataset.su === "key") { e.preventDefault(); saveKey(); } });
    el.addEventListener("change", function (e) {
      var t = e.target; if (!t.dataset) return;
      if (t.dataset.su === "week") { state.week = +t.value; render(el, state); }
      else if (t.dataset.su === "tick") { setTick(t.dataset.k, t.checked); var li = t.closest("li"); if (li) li.classList.toggle("done", t.checked); }
    });
    if (!state.cfg.url) { render(el, state); return; }
    load(el, state);
  }

  window.WTCSignups = { mount: mount, _summarise: summarise, _parseCSV: parseCSV, _rowsFromTable: rowsFromTable };
})();
