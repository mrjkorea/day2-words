(function () {
  "use strict";

  var SCORE_KEY = "mrj.day2words.songScores";
  var STATE_KEY = "mrj.day2words.state";
  var TAP_LEAD = 0.32;
  var TAP_TRAIL = 0.38;

  var audio = document.getElementById("audio");
  var song = null;
  var mode = "ready";
  var lineIdx = 0;
  var builtLine = -1;
  var wordEls = [];
  var hits = {};
  var front = 0;
  var picKey = "";
  var raf = 0;
  var practiceRep = 0;
  var sliceEnd = 0;
  var sliceArmed = false;
  var gapTimer = 0;
  var paused = false;
  var ended = false;

  function $(id) { return document.getElementById(id); }

  function songIdFromUrl() {
    var q = new URLSearchParams(location.search).get("song") || "";
    if (!/^[a-z0-9_]+$/.test(q)) return "";
    return q;
  }

  function showError(msg) {
    var el = $("err");
    el.hidden = false;
    el.textContent = msg;
  }

  function readScores() {
    try {
      var raw = localStorage.getItem(SCORE_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function starCount(percent, hitCount) {
    if (percent >= 85) return 3;
    if (percent >= 60) return 2;
    if (hitCount > 0) return 1;
    return 0;
  }

  function starString(n) {
    var s = "";
    var i;
    for (i = 0; i < 3; i++) s += i < n ? "★" : "☆";
    return s;
  }

  function showBest() {
    if (!song) return;
    var best = (readScores()[song.id] || {}).best;
    var el = $("ready-best");
    if (best && typeof best.percent === "number") {
      el.hidden = false;
      el.textContent = "Best " + best.percent + "% " + starString(best.stars);
    } else {
      el.hidden = true;
    }
  }

  function account() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      var st = raw ? JSON.parse(raw) : {};
      return st && typeof st === "object" ? st : {};
    } catch (e) {
      return {};
    }
  }

  function slimFromState(st) {
    var sets = {};
    Object.keys(st.sets || {}).forEach(function (k) {
      var s = st.sets[k];
      var pid = s && s.packId;
      if (!pid) return;
      sets[pid] = {
        title: s.title || "",
        winsA: s.winsA || {},
        winsB: s.winsB || {},
        winsC: s.winsC || {},
        intro: s.intro || {},
        meetLock: Array.isArray(s.meetLock) ? s.meetLock.slice() : [],
        tapmapKey: s.tapmapKey || "",
        lastPlayedAt: s.lastPlayedAt || 0,
        srsTrying: !!s.srsTrying,
        srsForever: !!s.srsForever,
        srsStage: s.srsStage || 0,
        srsNextAt: s.srsNextAt || null,
      };
    });
    return {
      v: 1,
      studentId: st.studentId || "",
      voice: st.voice || "",
      locale: st.locale || "en",
      studySize: st.studySize || 10,
      testKind: st.testKind || "",
      currentPackId: st.currentPackId || "",
      sets: sets,
    };
  }

  function saveScore(result) {
    var bag = readScores();
    var prev = bag[song.id] || {};
    var best = prev.best;
    if (!best || result.percent >= best.percent) best = result;
    bag[song.id] = { last: result, best: best };
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(bag)); } catch (e) {}

    var url = window.WM_PROGRESS_URL;
    var prog = window.MRJ_WM_progress;
    if (!url || !prog || typeof prog.save !== "function" || typeof prog.load !== "function") return;

    var st = account();
    var name = String(st.accountName || "").trim();
    var pin = String(st.accountPin || "").replace(/\D/g, "");
    if (!name || pin.length !== 4) return;

    var base = slimFromState(st);
    base.songScores = {};
    Object.keys(bag).forEach(function (id) {
      base.songScores[id] = bag[id];
    });

    function send(obj) {
      obj.songScores = base.songScores;
      prog.save({
        action: "save",
        name: name,
        pin: pin,
        pack_id: "day2_song_" + song.id,
        pack_title: song.title || song.id,
        screen: "sing",
        word_id: "score",
        study_size: result.percent,
        locale: st.locale || "en",
        student_id: st.studentId || "",
        progress_json: JSON.stringify(obj),
      }).catch(function () {});
    }

    prog.load({ action: "load", name: name, pin: pin }).then(function (res) {
      var obj = base;
      if (res && res.found && res.progress_json) {
        try {
          var remote = JSON.parse(res.progress_json);
          if (remote && remote.sets && typeof remote.sets === "object") {
            Object.keys(base.sets).forEach(function (pid) {
              remote.sets[pid] = base.sets[pid];
            });
            if (base.studentId) remote.studentId = base.studentId;
            obj = remote;
          }
        } catch (e) {}
      }
      send(obj);
    }).catch(function () {
      send(base);
    });
  }

  function picUrl(id) {
    return "../packs/" + song.packId + "/" + id + ".jpg";
  }

  function niceName(id) {
    if (id === "gymball") return "gym ball";
    return String(id || "").replace(/[_-]+/g, " ");
  }

  function firstPic() {
    var i, j, line, w;
    for (i = 0; i < song.lines.length; i++) {
      line = song.lines[i];
      if (line.pic) return line.pic;
      for (j = 0; j < (line.words || []).length; j++) {
        w = line.words[j];
        if (w.pic) return w.pic;
      }
    }
    return "";
  }

  function restartKen(slide) {
    var kb = slide.querySelector(".kb");
    kb.style.animation = "none";
    void kb.offsetWidth;
    kb.style.animation = "";
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function seekTo(seconds) {
    var target = Math.max(0, seconds || 0);
    var tries = 0;
    function attempt() {
      tries += 1;
      var now = audio.currentTime || 0;
      if (Math.abs(now - target) < 0.45) return;
      if (tries > 1 && now > target + 0.45) return;
      try { audio.currentTime = target; } catch (e) {}
      if (tries > 8) return;
      setTimeout(attempt, 90);
    }
    attempt();
  }

  function showBackdrop(pic, grad, dir) {
    var key = grad + "|" + (pic || "grad");
    if (key === picKey) return;
    picKey = key;
    var layers = $("slides").querySelectorAll(".slide");
    var back = 1 - front;
    var el = layers[back];
    var kb = el.querySelector(".kb");
    var img = el.querySelector("img");
    el.className = "slide dir" + mod(dir, 4);
    kb.className = "kb";
    if (pic) {
      img.alt = niceName(pic);
      img.hidden = false;
      img.onload = function () { img.hidden = false; };
      img.onerror = function () {
        img.hidden = true;
        kb.classList.add("grad", "grad-" + mod(grad, 6));
      };
      if (img.getAttribute("src") !== picUrl(pic)) img.src = picUrl(pic);
    } else {
      img.removeAttribute("src");
      img.alt = "";
      img.hidden = true;
      kb.classList.add("grad", "grad-" + mod(grad, 6));
    }
    restartKen(el);
    el.classList.add("show");
    layers[front].classList.remove("show");
    front = back;
  }

  function pictureFor(line, t) {
    var pic = line.pic || "";
    var i, w;
    for (i = 0; i < line.words.length; i++) {
      w = line.words[i];
      if (w.pic && t + 0.001 >= w.start) pic = w.pic;
    }
    return pic;
  }

  function lineIndexAt(t) {
    var i, idx = -1;
    for (i = 0; i < song.lines.length; i++) {
      if (t + 0.03 >= song.lines[i].start) idx = i;
    }
    return idx;
  }

  function clearWords() {
    $("line-now").innerHTML = "";
    wordEls = [];
    builtLine = -1;
  }

  function renderLine(idx) {
    var line = song.lines[idx];
    var next = song.lines[idx + 1];
    var host = $("line-now");
    if (builtLine !== idx) {
      host.innerHTML = "";
      wordEls = [];
      line.words.forEach(function (w, i) {
        var span = document.createElement("span");
        span.className = "word";
        span.dataset.i = String(i);
        var base = document.createElement("span");
        base.className = "base";
        base.textContent = w.t;
        var fill = document.createElement("span");
        fill.className = "fill";
        fill.textContent = w.t;
        fill.setAttribute("aria-hidden", "true");
        span.appendChild(base);
        span.appendChild(fill);
        span.addEventListener("pointerdown", function (ev) {
          if (mode !== "sing" || ended) return;
          ev.preventDefault();
          registerTap(audio.currentTime, i);
        });
        host.appendChild(span);
        wordEls.push(span);
      });
      builtLine = idx;
      $("line-next").textContent = next ? next.text : "";
    }
  }

  function paintWords(t) {
    var line = song.lines[lineIdx];
    var i, w, el, fill, p, right;
    for (i = 0; i < line.words.length; i++) {
      w = line.words[i];
      el = wordEls[i];
      if (!el) continue;
      fill = el.querySelector(".fill");
      if (hits[lineKey(lineIdx, i)]) el.classList.add("hit");
      if (t >= w.end) {
        el.classList.add("sung");
        el.classList.remove("on");
        fill.style.clipPath = "inset(0 0 0 0)";
      } else if (t >= w.start) {
        el.classList.add("on");
        el.classList.remove("sung");
        p = (t - w.start) / Math.max(0.06, w.end - w.start);
        if (p < 0) p = 0;
        if (p > 1) p = 1;
        right = ((1 - p) * 100).toFixed(1);
        fill.style.clipPath = "inset(0 " + right + "% 0 0)";
      } else {
        el.classList.remove("on");
        el.classList.remove("sung");
        fill.style.clipPath = "inset(0 100% 0 0)";
      }
    }
  }

  function syncVisual(t) {
    if (mode === "practice") {
      renderLine(lineIdx);
      paintWords(t);
      showBackdrop(pictureFor(song.lines[lineIdx], t), lineIdx, lineIdx);
      return;
    }
    var idx = lineIndexAt(t);
    if (idx < 0) {
      if (builtLine !== -2) {
        $("line-now").textContent = "";
        $("line-next").textContent = song.lines[0] ? song.lines[0].text : "";
        wordEls = [];
        builtLine = -2;
        lineIdx = -1;
      }
      showBackdrop("", -1, 0);
      var dur0 = song.duration || audio.duration || 0;
      if (dur0 > 0) $("track-bar").style.width = Math.min(100, (t / dur0) * 100) + "%";
      return;
    }
    if (idx !== lineIdx) lineIdx = idx;
    renderLine(lineIdx);
    paintWords(t);
    showBackdrop(pictureFor(song.lines[lineIdx], t), lineIdx, lineIdx);
    var dur = song.duration || audio.duration || 0;
    if (dur > 0) $("track-bar").style.width = Math.min(100, (t / dur) * 100) + "%";
  }

  function lineKey(li, wi) { return li + ":" + wi; }

  function allWords() {
    var list = [];
    song.lines.forEach(function (line, li) {
      line.words.forEach(function (w, wi) {
        list.push({ li: li, wi: wi, w: w });
      });
    });
    return list;
  }

  function registerTap(t, onlyWi) {
    if (mode !== "sing" || ended || paused || lineIdx < 0) return;
    var line = song.lines[lineIdx];
    var best = null;
    var bestDist = 999;
    var i, w, open, close, mid, dist, key;
    for (i = 0; i < line.words.length; i++) {
      if (onlyWi != null && i !== onlyWi) continue;
      key = lineKey(lineIdx, i);
      if (hits[key]) continue;
      w = line.words[i];
      open = w.start - (onlyWi != null ? TAP_LEAD + 0.12 : TAP_LEAD);
      close = w.end + TAP_TRAIL;
      if (t < open || t > close) continue;
      mid = (w.start + w.end) / 2;
      dist = Math.abs(t - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (best == null && onlyWi == null) {
      var next = song.lines[lineIdx + 1];
      if (next && next.words[0]) {
        w = next.words[0];
        if (t >= w.start - TAP_LEAD && t <= w.end + TAP_TRAIL && !hits[lineKey(lineIdx + 1, 0)]) {
          hits[lineKey(lineIdx + 1, 0)] = true;
          flashTap();
          return;
        }
      }
      return;
    }
    if (best == null) return;
    hits[lineKey(lineIdx, best)] = true;
    flashTap();
    paintWords(t);
  }

  function flashTap() {
    var btn = $("btn-tap");
    btn.classList.add("pop");
    setTimeout(function () { btn.classList.remove("pop"); }, 90);
  }

  function setPanels(which) {
    $("panel-ready").hidden = which !== "ready";
    $("panel-play").hidden = which !== "play";
    $("panel-score").hidden = which !== "score";
    $("btn-pause").hidden = which !== "play";
    $("track").hidden = which !== "play" || mode === "practice";
  }

  function stopGap() {
    if (gapTimer) {
      clearTimeout(gapTimer);
      gapTimer = 0;
    }
  }

  function pauseAudio() {
    try { audio.pause(); } catch (e) {}
  }

  function playAudio() {
    var p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {
        if (mode === "practice") {
          $("rep-label").textContent = "Tap Next";
        }
      });
    }
    return p;
  }

  function goReady() {
    mode = "ready";
    ended = false;
    paused = false;
    stopGap();
    pauseAudio();
    try { audio.currentTime = 0; } catch (e) {}
    clearWords();
    setPanels("ready");
    $("btn-pause").textContent = "Pause";
    showBest();
    var pic = firstPic();
    picKey = "";
    showBackdrop(pic, 0, 0);
  }

  function beginListen(from) {
    mode = "listen";
    ended = false;
    paused = false;
    hits = {};
    stopGap();
    lineIdx = -1;
    builtLine = -1;
    setPanels("play");
    $("practice-bar").hidden = true;
    $("btn-tap").hidden = true;
    $("btn-pause").textContent = "Pause";
    seekTo(from || 0);
    playAudio();
  }

  function beginSing() {
    mode = "sing";
    ended = false;
    paused = false;
    hits = {};
    stopGap();
    lineIdx = -1;
    builtLine = -1;
    setPanels("play");
    $("practice-bar").hidden = true;
    $("btn-tap").hidden = false;
    $("btn-pause").textContent = "Pause";
    seekTo(0);
    playAudio();
  }

  function practiceSliceEnd(idx) {
    var line = song.lines[idx];
    var next = song.lines[idx + 1];
    var end = line.end + 0.12;
    if (next) end = Math.min(next.start - 0.04, Math.max(line.end, next.start - 0.04));
    if (end < line.start + 0.2) end = line.end + 0.05;
    return end;
  }

  function startPracticeLine(idx, rep) {
    if (idx < 0) idx = 0;
    if (idx >= song.lines.length) {
      practiceDone();
      return;
    }
    mode = "practice";
    ended = false;
    paused = false;
    lineIdx = idx;
    practiceRep = rep || 0;
    builtLine = -1;
    sliceEnd = practiceSliceEnd(idx);
    sliceArmed = false;
    setPanels("play");
    $("practice-bar").hidden = false;
    $("btn-tap").hidden = true;
    $("btn-pause").textContent = "Pause";
    $("rep-label").textContent = (practiceRep + 1) + " / 3";
    renderLine(idx);
    showBackdrop(pictureFor(song.lines[idx], song.lines[idx].start), idx, idx);
    seekTo(song.lines[idx].start);
    playAudio();
  }

  function practiceDone() {
    stopGap();
    pauseAudio();
    mode = "ready";
    setPanels("score");
    $("score-stars").textContent = "★★★";
    $("score-pct").textContent = "Done!";
    $("score-msg").textContent = "You practiced every line!";
    $("score-detail").textContent = "연습 끝! Sing and tap when you are ready.";
    $("btn-again").textContent = "Sing and Tap";
  }

  function finishSing() {
    if (ended) return;
    ended = true;
    stopGap();
    pauseAudio();
    var total = 0;
    var hitCount = 0;
    allWords().forEach(function (item) {
      total += 1;
      if (hits[lineKey(item.li, item.wi)]) hitCount += 1;
    });
    var percent = total ? Math.round((100 * hitCount) / total) : 0;
    var stars = starCount(percent, hitCount);
    var msg = "Let's sing again!";
    if (stars >= 3) msg = "Wow! Super star!";
    else if (stars === 2) msg = "Great job!";
    else if (stars === 1) msg = "Good try!";
    $("score-stars").textContent = starString(stars);
    $("score-pct").textContent = percent + "%";
    $("score-msg").textContent = msg;
    $("score-detail").textContent = hitCount + " / " + total + " words  ·  " + (stars ? "잘했어요!" : "다시 해 봐요!");
    $("btn-again").textContent = "Sing again";
    setPanels("score");
    var result = {
      percent: percent,
      stars: stars,
      hits: hitCount,
      total: total,
      at: Date.now(),
    };
    saveScore(result);
    showBest();
  }

  function onTime() {
    if (!song || paused) return;
    var t = audio.currentTime || 0;
    if (mode === "listen" || mode === "sing") {
      if (ended) return;
      syncVisual(t);
      var mediaDur = (isFinite(audio.duration) && audio.duration > 1) ? audio.duration : 0;
      var dur = mediaDur || song.duration || 0;
      var last = song.lines[song.lines.length - 1];
      var atEnd = audio.ended || (dur > 1 && t >= dur - 0.12) || (last && t >= last.end + 1.2 && t >= (song.duration || dur) - 0.2);
      if (atEnd) {
        if (mode === "sing") finishSing();
        else {
          ended = true;
          setPanels("score");
          $("score-stars").textContent = "♪";
          $("score-pct").textContent = "End";
          $("score-msg").textContent = "Want to sing it?";
          $("score-detail").textContent = "Tap Sing and Tap and press TAP on each word.";
          $("btn-again").textContent = "Sing and Tap";
        }
      }
      return;
    }
    if (mode !== "practice") return;
    if (!sliceArmed) {
      if (t >= song.lines[lineIdx].start - 0.05) sliceArmed = true;
      else return;
    }
    syncVisual(t);
    if (t >= sliceEnd - 0.02) {
      pauseAudio();
      practiceRep += 1;
      if (practiceRep < 3) {
        $("rep-label").textContent = (practiceRep + 1) + " / 3";
        stopGap();
        gapTimer = setTimeout(function () {
          gapTimer = 0;
          if (mode !== "practice" || paused) return;
          sliceArmed = false;
          seekTo(song.lines[lineIdx].start);
          builtLine = -1;
          renderLine(lineIdx);
          playAudio();
        }, 420);
      } else {
        stopGap();
        gapTimer = setTimeout(function () {
          gapTimer = 0;
          if (mode !== "practice" || paused) return;
          startPracticeLine(lineIdx + 1, 0);
        }, 500);
      }
    }
  }

  function loop() {
    onTime();
    raf = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (mode !== "listen" && mode !== "sing" && mode !== "practice") return;
    paused = !paused;
    if (paused) {
      pauseAudio();
      $("btn-pause").textContent = "Play";
    } else {
      $("btn-pause").textContent = "Pause";
      if (mode === "practice" && !gapTimer) playAudio();
      else if (mode !== "practice") playAudio();
    }
  }

  $("btn-listen").addEventListener("click", function () { beginListen(0); });
  $("btn-practice").addEventListener("click", function () { startPracticeLine(0, 0); });
  $("btn-sing").addEventListener("click", function () { beginSing(); });
  $("btn-tap").addEventListener("pointerdown", function (ev) {
    ev.preventDefault();
    registerTap(audio.currentTime, null);
  });
  $("btn-pause").addEventListener("click", togglePause);
  $("btn-prev").addEventListener("click", function () {
    if (mode !== "practice") return;
    stopGap();
    startPracticeLine(Math.max(0, lineIdx - 1), 0);
  });
  $("btn-next").addEventListener("click", function () {
    if (mode !== "practice") return;
    stopGap();
    startPracticeLine(lineIdx + 1, 0);
  });
  $("btn-again").addEventListener("click", function () { beginSing(); });
  $("btn-listen-again").addEventListener("click", function () { beginListen(0); });
  audio.addEventListener("ended", function () {
    if (mode === "sing") finishSing();
    else if (mode === "listen") onTime();
  });
  audio.addEventListener("error", function () {
    showError("Could not play the music. Tap a button to try again.");
  });

  var id = songIdFromUrl();
  if (!id) {
    showError("Missing song. Go back and pick one.");
    $("panel-ready").hidden = true;
  } else {
    fetch("data/" + id + ".json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("song");
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.lines || !data.lines.length) throw new Error("empty");
        song = data;
        document.title = (song.title || "Song") + " · Songs";
        $("song-title").textContent = song.title || "Song";
        $("ready-title").textContent = song.title || "Song";
        $("ready-sub").textContent = (song.book || "") + (song.unitTitle ? " · Unit " + song.unit + " · " + song.unitTitle : "");
        audio.src = song.audio;
        audio.load();
        showBest();
        picKey = "";
        showBackdrop(firstPic(), 0, 0);
        loop();
      })
      .catch(function () {
        showError("Could not load this song.");
        $("panel-ready").hidden = true;
      });
  }
})();
