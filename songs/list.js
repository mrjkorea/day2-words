(function () {
  "use strict";

  var SCORE_KEY = "mrj.day2words.songScores";

  function scores() {
    try {
      var raw = localStorage.getItem(SCORE_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function stars(n) {
    var s = "";
    var i;
    n = n || 0;
    for (i = 0; i < 3; i++) s += i < n ? "★" : "☆";
    return s;
  }

  var box = document.getElementById("song-list");

  fetch("data/catalog.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("catalog");
      return res.json();
    })
    .then(function (cat) {
      var songs = (cat && cat.songs) || [];
      var bag = scores();
      box.innerHTML = "";
      box.className = "";
      if (!songs.length) {
        box.className = "list-empty";
        box.textContent = "No songs yet.";
        return;
      }
      songs.forEach(function (song) {
        var a = document.createElement("a");
        a.className = "song-card";
        a.href = "play.html?song=" + encodeURIComponent(song.id);
        var best = bag[song.id] && bag[song.id].best;
        var unit = document.createElement("div");
        unit.className = "song-num";
        unit.textContent = String(song.unit || "♪");
        var body = document.createElement("div");
        var h = document.createElement("h2");
        h.textContent = song.title || song.id;
        var p = document.createElement("p");
        p.textContent = (song.book || "") + (song.unitTitle ? " · " + song.unitTitle : "");
        body.appendChild(h);
        body.appendChild(p);
        if (best && typeof best.percent === "number") {
          var small = document.createElement("small");
          small.textContent = "Best " + best.percent + "% " + stars(best.stars);
          body.appendChild(small);
        }
        a.appendChild(unit);
        a.appendChild(body);
        box.appendChild(a);
      });
    })
    .catch(function () {
      box.className = "list-empty";
      box.textContent = "Could not load the song list.";
    });
})();
