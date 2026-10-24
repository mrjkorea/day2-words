(function () {
  "use strict";
  var SCORE_KEY = "mrj.day2words.songScores";
  var BOOKS = [
    { id: "basic_a", name: "Basic A", color: "#ff6b6b" },
    { id: "basic_b", name: "Basic B", color: "#ffa94d" },
    { id: "basic_c", name: "Basic C", color: "#ffd43b" },
    { id: "int2a", name: "INT 2A", color: "#69db7c" },
    { id: "int2b", name: "INT 2B", color: "#38d9a9" },
    { id: "int2c", name: "INT 2C", color: "#4dabf7" },
    { id: "int3a", name: "INT 3A", color: "#9775fa" },
    { id: "int3b", name: "INT 3B", color: "#da77f2" },
    { id: "int3c", name: "INT 3C", color: "#f783ac" }
  ];
  var TEST = new URLSearchParams(location.search).get("test") === "1";

  function scores() {
    try { var o = JSON.parse(localStorage.getItem(SCORE_KEY) || "{}"); return o && typeof o === "object" ? o : {}; }
    catch (e) { return {}; }
  }
  function stars(n) { var s = "", i; for (i = 0; i < 3; i++) s += i < (n || 0) ? "★" : "☆"; return s; }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function bookOf(id) { var m = /^(.+)_u\d+_[a-z]$/.exec(id); return m ? m[1] : ""; }
  function letter(id) { var m = /_([a-z])$/.exec(id); return m ? m[1].toUpperCase() : ""; }

  var tabs = document.getElementById("book-tabs");
  var box = document.getElementById("song-list");
  var byBook = {}, current = "", started = false;

  function pickStart() {
    var q = (new URLSearchParams(location.search).get("book") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    var i;
    for (i = 0; i < BOOKS.length; i++) if (BOOKS[i].id.replace(/_/g, "") === q.replace(/_/g, "") && byBook[BOOKS[i].id]) return BOOKS[i].id;
    try { var last = localStorage.getItem("mrj.day2words.songBook"); if (last && byBook[last]) return last; } catch (e) {}
    return BOOKS[0].id;
  }

  function drawTabs() {
    tabs.innerHTML = "";
    BOOKS.forEach(function (b) {
      var ready = !!byBook[b.id];
      var t = mk("button", "book-tab" + (b.id === current ? " on" : "") + (ready ? "" : " soon"));
      t.type = "button";
      t.setAttribute("role", "tab");
      t.setAttribute("aria-selected", b.id === current ? "true" : "false");
      t.style.setProperty("--c", b.color);
      t.appendChild(mk("span", "bt-name", b.name));
      t.appendChild(mk("span", "bt-sub", ready ? byBook[b.id].length + " songs" : "Coming soon"));
      if (ready) t.addEventListener("click", function () { show(b.id, true); });
      else t.disabled = true;
      tabs.appendChild(t);
    });
  }

  function show(id, user) {
    current = id;
    try { localStorage.setItem("mrj.day2words.songBook", id); } catch (e) {}
    if (user) {
      var p = new URLSearchParams(location.search); p.set("book", id);
      history.replaceState(null, "", "?" + p.toString());
    }
    drawTabs();
    var b = BOOKS.filter(function (x) { return x.id === id; })[0];
    var bag = scores();
    box.innerHTML = ""; box.className = "unit-grid";
    box.style.setProperty("--c", b.color);
    var head = mk("h2", "book-head", b.name + " songs");
    box.appendChild(head);
    byBook[id].slice().sort(function (a, c) { return (a.unit || 0) - (c.unit || 0) || (a.id < c.id ? -1 : 1); })
      .forEach(function (song) {
        var a = mk("a", "song-card");
        a.href = "play.html?song=" + encodeURIComponent(song.id) + (TEST ? "&test=1" : "");
        var num = mk("div", "song-num");
        num.appendChild(mk("small", "", "Unit"));
        num.appendChild(document.createTextNode(String(song.unit || "♪")));
        var body = mk("div", "song-body");
        body.appendChild(mk("p", "song-unit", song.unitTitle || ""));
        body.appendChild(mk("h3", "", "🎵 " + (song.title || song.id)));
        var meta = mk("p", "song-meta");
        meta.appendChild(mk("span", "song-ab", "Song " + letter(song.id)));
        if (song.blurb) meta.appendChild(mk("span", "song-blurb", song.blurb));
        body.appendChild(meta);
        var best = bag[song.id] && bag[song.id].best;
        if (best && typeof best.percent === "number") body.appendChild(mk("small", "song-best", "Best " + best.percent + "% " + stars(best.stars)));
        a.appendChild(num); a.appendChild(body); a.appendChild(mk("span", "song-go", "▶"));
        box.appendChild(a);
      });
    if (user) tabs.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function startList() {
    if (started) return; started = true;
    fetch("data/catalog.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("catalog"); return r.json(); })
      .then(function (cat) {
        (cat && cat.songs || []).forEach(function (s) { var k = bookOf(s.id); (byBook[k] = byBook[k] || []).push(s); });
        if (!Object.keys(byBook).length) { box.textContent = "No songs yet."; return; }
        show(pickStart(), false);
      })
      .catch(function () { box.className = "list-empty"; box.textContent = "Could not load the song list."; });
  }
  window.addEventListener("mrj-auth-ready", startList);
})();
