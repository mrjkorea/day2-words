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
  var authId = "";
  var songStarted = false;

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

    var prog = window.MRJ_WM_progress;
    if (!prog || typeof prog.save !== "function" || typeof prog.load !== "function") return;

    var id = String(authId || "").trim();
    if (!id) return;

    var st = account();
    var base = slimFromState(st);
    base.studentId = id;
    base.songScores = {};
    Object.keys(bag).forEach(function (sid) {
      base.songScores[sid] = bag[sid];
    });

    function mergeSongScores(obj) {
      obj.songScores = obj.songScores || {};
      Object.keys(base.songScores).forEach(function (sid) {
        obj.songScores[sid] = base.songScores[sid];
      });
      obj.songStages = readStages();
      return obj;
    }

    function send(obj) {
      mergeSongScores(obj);
      prog.save({
        pack_id: "day2_song_" + song.id,
        pack_title: song.title || song.id,
        screen: result.screen || "song",
        word_id: result.wordId || "score",
        study_size: result.percent,
        locale: st.locale || "en",
        progress_json: JSON.stringify(obj),
      }).catch(function () {});
    }

    prog.load().then(function (res) {
      var obj = base;
      if (res && res.found && res.progress_json) {
        try {
          var remote = typeof res.progress_json === "string"
            ? JSON.parse(res.progress_json)
            : res.progress_json;
          var mergeFn = window.MRJ_WM_merge;
          if (mergeFn && remote && remote.sets) {
            obj = mergeFn(base, remote);
          } else if (remote && typeof remote === "object") {
            obj = remote;
          }
          mergeSongScores(obj);
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

  /* ---------- stages (2026-10-16) ---------- */
  var STAGE_KEY = "mrj.day2words.songStages";
  var STAGES = ["listen", "tap", "practice", "quiz"];
  var STAGE_NAME = { listen: "Listen", tap: "Tap", practice: "Practice", quiz: "Mini Quiz" };
  var STAGE_BTN = { listen: "btn-listen", tap: "btn-tap-stage", practice: "btn-practice", quiz: "btn-quiz" };

  function readStages() {
    try {
      var o = JSON.parse(localStorage.getItem(STAGE_KEY) || "{}");
      return o && typeof o === "object" ? o : {};
    } catch (e) { return {}; }
  }
  function songStages() { return (song && readStages()[song.id]) || {}; }
  function isDone(stage) { return !!songStages()[stage]; }
  function isUnlocked(stage) {
    var i = STAGES.indexOf(stage);
    return i <= 0 || isDone(STAGES[i - 1]);
  }
  function markDone(stage, extra) {
    var all = readStages();
    var mine = all[song.id] || {};
    mine[stage] = extra || { at: Date.now() };
    all[song.id] = mine;
    try { localStorage.setItem(STAGE_KEY, JSON.stringify(all)); } catch (e) {}
    var r = extra && typeof extra.percent === "number" ? extra : { percent: 100, stars: 3, at: Date.now() };
    r.screen = stage;
    r.wordId = "stage_" + stage;
    try { saveScore(r); } catch (e) {}
  }
  function nextStage() {
    for (var i = 0; i < STAGES.length; i++) if (!isDone(STAGES[i])) return STAGES[i];
    return "";
  }
  function refreshStageButtons() {
    STAGES.forEach(function (st, i) {
      var b = $(STAGE_BTN[st]);
      var open = isUnlocked(st);
      b.disabled = !open || (st === "quiz" && isDone(st));
      b.classList.toggle("done", isDone(st));
      var sm = b.querySelector("small");
      if (!sm.dataset.orig) sm.dataset.orig = sm.textContent;
      sm.textContent = open ? sm.dataset.orig : "🔒 Finish " + STAGE_NAME[STAGES[i - 1]] + " first";
    });
  }
  function showBestStage() {
    var q = songStages().quiz;
    var el = $("ready-best");
    if (q && typeof q.score === "number") {
      el.hidden = false;
      el.textContent = "Quiz: " + q.score + " / " + q.total + (q.passed === false ? " · Try again with your teacher" : "");
    } else el.hidden = true;
  }

  /* ---------- audio slice engine ---------- */
  var slice = null;
  var sliceToken = 0;
  function stopSlice() { slice = null; sliceToken += 1; audio.muted = false; }
  function playSlice(start, end, muted, done) {
    stopSlice();
    pauseAudio();
    var tok = sliceToken;
    var s = { start: start, end: end, done: done, armed: false, muted: !!muted };
    slice = s;
    audio.muted = !!muted;
    var tries = 0;
    function arm() {
      if (tok !== sliceToken || s.armed) return;
      var now = audio.currentTime || 0;
      if (Math.abs(now - s.start) > 0.35 && tries < 12) {
        tries += 1;
        try { audio.currentTime = Math.max(0, s.start); } catch (e) {}
        setTimeout(arm, 150);
        return;
      }
      s.armed = true;
      audio.muted = s.muted;
      playAudio();
    }
    try { audio.currentTime = Math.max(0, start); } catch (e) {}
    setTimeout(arm, 120);
  }
  function tickSlice(t) {
    if (!slice || !slice.armed) return;
    if (t >= slice.end - 0.01 || audio.ended) {
      var s = slice;
      pauseAudio();
      stopSlice();
      if (s.done) s.done();
    }
  }
  window.__songDebug = {
    get mode() { return mode; },
    get line() { return lineIdx; },
    get pos() { return uPos; },
    get uniqCount() { return uniq.length; },
    get uniqTexts() { return uniq.map(function (i) { return song.lines[i].text; }); },
    get rep() { return practiceRep; },
    get muted() { return audio.muted; },
    get slice() { return slice ? { start: slice.start, end: slice.end, armed: slice.armed, muted: slice.muted } : null; },
    tapLine: function (i) { startTapLine(i); },
    practiceLine: function (i) { startPracticeLine(i); },
    log: [],
  };
  function dlog(x) { window.__songDebug.log.push(x); }

  /* ---------- lines ---------- */
  function clearWords() {
    $("line-now").innerHTML = "";
    wordEls = [];
    builtLine = -1;
  }

  function renderLine(idx) {
    var line = song.lines[idx];
    var next = song.lines[idx + 1];
    var host = $("line-now");
    if (builtLine === idx) return;
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
      span.addEventListener("click", function (ev) {
        ev.preventDefault();
        onWordTap(i);
      });
      host.appendChild(span);
      wordEls.push(span);
    });
    builtLine = idx;
    $("line-next").textContent = next ? next.text : "";
  }

  function paintWords(t, idx) {
    var line = song.lines[idx];
    var i, w, el, fill, p;
    for (i = 0; i < line.words.length; i++) {
      w = line.words[i];
      el = wordEls[i];
      if (!el) continue;
      fill = el.querySelector(".fill");
      if (t >= w.end) {
        el.classList.add("sung"); el.classList.remove("on");
        fill.style.clipPath = "inset(0 0 0 0)";
      } else if (t >= w.start) {
        el.classList.add("on"); el.classList.remove("sung");
        p = Math.min(1, Math.max(0, (t - w.start) / Math.max(0.06, w.end - w.start)));
        fill.style.clipPath = "inset(0 " + ((1 - p) * 100).toFixed(1) + "% 0 0)";
      } else {
        el.classList.remove("on"); el.classList.remove("sung");
        fill.style.clipPath = "inset(0 100% 0 0)";
      }
    }
  }
  function resetPaint() {
    wordEls.forEach(function (el) {
      el.classList.remove("on", "sung");
      el.querySelector(".fill").style.clipPath = "inset(0 100% 0 0)";
    });
  }

  function syncListen(t) {
    var idx = lineIndexAt(t);
    var dur = song.duration || audio.duration || 0;
    if (dur > 0) $("track-bar").style.width = Math.min(100, (t / dur) * 100) + "%";
    if (idx < 0) {
      if (builtLine !== -2) {
        $("line-now").textContent = "";
        $("line-next").textContent = song.lines[0] ? song.lines[0].text : "";
        wordEls = [];
        builtLine = -2;
      }
      showBackdrop(firstPic(), 0, 0);
      return;
    }
    lineIdx = idx;
    renderLine(idx);
    paintWords(t, idx);
    showBackdrop(pictureFor(song.lines[idx], t), idx, idx);
  }

  function setPanels(which) {
    $("panel-ready").hidden = which !== "ready";
    $("panel-play").hidden = which !== "play";
    $("panel-quiz").hidden = which !== "quiz";
    $("panel-score").hidden = which !== "score";
    $("btn-pause").hidden = which !== "play" || mode !== "listen";
    $("track").hidden = which !== "play" || mode !== "listen";
  }
  function stopGap() { if (gapTimer) { clearTimeout(gapTimer); gapTimer = 0; } }
  function pauseAudio() { try { audio.pause(); } catch (e) {} }
  function playAudio() {
    var p = audio.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
    return p;
  }

  function goReady() {
    mode = "ready";
    ended = false;
    paused = false;
    stopGap();
    stopSlice();
    pauseAudio();
    clearWords();
    setPanels("ready");
    refreshStageButtons();
    showBestStage();
    picKey = "";
    showBackdrop(firstPic(), 0, 0);
  }

  function stageDoneScreen(stage, big, msg, detail) {
    mode = "done";
    $("panel-play").classList.remove("solo");
    stopGap(); stopSlice(); pauseAudio();
    setPanels("score");
    $("score-stars").textContent = "★★★";
    $("score-pct").textContent = big;
    $("score-msg").textContent = msg;
    $("score-detail").textContent = detail;
    var nx = nextStage();
    $("btn-again").hidden = !nx;
    if (nx) $("btn-again").textContent = "Next: " + STAGE_NAME[nx];
  }

  /* ---------- Stage 1: Listen ---------- */
  function beginListen() {
    if (!isUnlocked("listen")) return;
    mode = "listen";
    ended = false;
    paused = false;
    stopSlice();
    lineIdx = -1;
    builtLine = -1;
    setPanels("play");
    $("practice-bar").hidden = true;
    $("tap-hint").hidden = true;
    $("btn-pause").textContent = "Pause";
    audio.muted = false;
    try { audio.currentTime = 0; } catch (e) {}
    playAudio();
  }
  function finishListen() {
    if (ended) return;
    ended = true;
    markDone("listen");
    stageDoneScreen("listen", "Done!", "You listened to the song!", "듣기 끝! Now tap the words.");
  }

  var uniq = [];
  function buildUniq() {
    var seen = {};
    uniq = [];
    song.lines.forEach(function (l, i) {
      var k = String(l.text || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
      if (seen[k]) return;
      seen[k] = 1;
      uniq.push(i);
    });
  }
  var uPos = 0;
  /* ---------- Stage 2: Tap ---------- */
  var tapped = {};
  var tapBusy = false;
  function startTapLine(pos) {
    uPos = pos;
    var idx = uniq[pos];
    if (pos >= uniq.length) {
      markDone("tap");
      stageDoneScreen("tap", "Done!", "You tapped every word!", "누르기 끝! Now practice singing.");
      return;
    }
    mode = "tap";
    lineIdx = idx;
    tapped = {};
    tapBusy = false;
    builtLine = -1;
    setPanels("play");
    $("practice-bar").hidden = false;
    $("btn-prev").hidden = true;
    $("btn-next").hidden = true;
    $("tap-hint").hidden = false;
    $("tap-hint").textContent = "Tap each word!";
    $("rep-label").textContent = "Line " + (pos + 1) + " / " + uniq.length;
    renderLine(idx);
    resetPaint();
    showBackdrop(pictureFor(song.lines[idx], song.lines[idx].start), idx, idx);
  }
  function onWordTap(i) {
    if (mode !== "tap" || tapBusy) return;
    var line = song.lines[lineIdx];
    var w = line.words[i];
    tapped[i] = true;
    wordEls[i].classList.add("tapped");
    dlog({ ev: "word", line: lineIdx, i: i, t: w.t });
    var allDone = line.words.every(function (_, k) { return tapped[k]; });
    var li = lineIdx;
    playSlice(w.start - 0.03, w.end + 0.06, false, function () {
      if (!allDone || mode !== "tap" || li !== lineIdx) return;
      tapBusy = true;
      $("tap-hint").textContent = "Listen to the line!";
      gapTimer = setTimeout(function () {
        gapTimer = 0;
        dlog({ ev: "line", line: li });
        playSlice(line.start - 0.05, practiceSliceEnd(li), false, function () {
          gapTimer = setTimeout(function () { gapTimer = 0; startTapLine(uPos + 1); }, 500);
        });
      }, 300);
    });
    if (slice) slice.noPaint = true;
  }

  /* ---------- Stage 3: Practice ---------- */
  function practiceSliceEnd(idx) {
    var line = song.lines[idx];
    var next = song.lines[idx + 1];
    var end = line.end + 0.35;
    if (next) end = Math.min(end, next.start - 0.04);
    if (end < line.end) end = line.end + 0.02;
    return end;
  }
  function startPracticeLine(pos) {
    if (pos < 0) pos = 0;
    uPos = pos;
    var idx = uniq[pos];
    if (pos >= uniq.length) {
      markDone("practice");
      stageDoneScreen("practice", "Done!", "You practiced every line!", "연습 끝! Try the mini quiz.");
      return;
    }
    stopGap();
    mode = "practice";
    lineIdx = idx;
    builtLine = -1;
    setPanels("play");
    $("practice-bar").hidden = false;
    $("btn-prev").hidden = false;
    $("btn-next").hidden = false;
    $("btn-next").disabled = true;
    $("btn-prev").disabled = pos === 0;
    $("tap-hint").hidden = false;
    renderLine(idx);
    showBackdrop(pictureFor(song.lines[idx], song.lines[idx].start), idx, idx);
    practicePlay(0);
  }
  function practicePlay(rep) {
    practiceRep = rep;
    var li = lineIdx;
    var line = song.lines[li];
    var solo = rep === 2;
    $("rep-label").textContent = (rep + 1) + " / 3";
    $("panel-play").classList.toggle("solo", solo);
    $("tap-hint").textContent = solo ? "Your turn! Sing alone 🎤" : "Listen and sing";
    resetPaint();
    dlog({ ev: "practice", line: li, rep: rep, muted: solo });
    playSlice(line.start - 0.05, practiceSliceEnd(li), solo, function () {
      if (mode !== "practice" || li !== lineIdx) return;
      if (rep < 2) {
        gapTimer = setTimeout(function () { gapTimer = 0; practicePlay(rep + 1); }, 600);
      } else {
        practiceRep = 3;
        $("panel-play").classList.remove("solo");
        $("rep-label").textContent = "3 / 3 ✓";
        $("tap-hint").textContent = "Great! Tap Next";
        $("btn-next").disabled = false;
      }
    });
  }

  /* ---------- Stage 4: Mini quiz ---------- */
  var quizIdx = 0;
  var quizScore = 0;
  var quizLock = false;
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function beginQuiz() {
    if (!isUnlocked("quiz") || isDone("quiz")) return;
    quizIdx = 0;
    quizScore = 0;
    showQuiz();
  }
  function lineByN(n) {
    for (var i = 0; i < song.lines.length; i++) if (song.lines[i].n === n) return i;
    return 0;
  }
  function playQuizAudio(q) {
    var li = lineByN(q.line);
    playSlice(song.lines[li].start - 0.05, practiceSliceEnd(li), false, null);
  }
  function showQuiz() {
    var qs = song.quiz || [];
    if (quizIdx >= qs.length) return finishQuiz();
    mode = "quiz";
    quizLock = false;
    var q = qs[quizIdx];
    setPanels("quiz");
    $("quiz-count").textContent = (quizIdx + 1) + " / " + qs.length;
    $("quiz-prompt").textContent = q.prompt;
    var pic = $("quiz-pic");
    var play = $("quiz-play");
    var host = $("quiz-choices");
    host.innerHTML = "";
    if (q.type === "listen") {
      pic.hidden = true;
      play.hidden = false;
      play.onclick = function () { playQuizAudio(q); };
      playQuizAudio(q);
      host.className = "quiz-choices pics";
    } else {
      play.hidden = true;
      pic.hidden = false;
      pic.src = picUrl(q.pic);
      pic.alt = "picture";
      host.className = "quiz-choices";
    }
    shuffle(q.choices).forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "qc";
      b.dataset.v = c;
      if (q.type === "listen") {
        var im = document.createElement("img");
        im.src = picUrl(c);
        im.alt = niceName(c);
        b.appendChild(im);
      } else b.textContent = c;
      b.addEventListener("click", function () {
        if (quizLock) return;
        quizLock = true;
        var ok = c === q.answer;
        if (ok) quizScore += 1;
        b.classList.add(ok ? "right" : "wrong");
        if (!ok) Array.prototype.forEach.call(host.children, function (x) { if (x.dataset.v === q.answer) x.classList.add("right"); });
        dlog({ ev: "quiz", q: quizIdx, ok: ok });
        stopSlice(); pauseAudio();
        gapTimer = setTimeout(function () { gapTimer = 0; quizIdx += 1; showQuiz(); }, ok ? 800 : 1600);
      });
      host.appendChild(b);
    });
  }
  function finishQuiz() {
    var total = (song.quiz || []).length;
    var PASS = 3;
    var percent = total ? Math.round((100 * quizScore) / total) : 0;
    var stars = quizScore >= total ? 3 : quizScore >= total - 1 ? 2 : quizScore >= PASS ? 1 : 0;
    var all = readStages();
    var mine = all[song.id] || {};
    var attempts = (mine.quizAttempts || 0) + 1;
    mine.quizAttempts = attempts;
    mine.quizScores = (mine.quizScores || []).concat([quizScore]);
    all[song.id] = mine;
    try { localStorage.setItem(STAGE_KEY, JSON.stringify(all)); } catch (e) {}
    var passed = quizScore >= PASS;
    var prog = window.MRJ_WM_progress;
    if (prog && typeof prog.logResult === "function") {
      try {
        prog.logResult({ packId: "day2_song_" + song.id, packTitle: song.title || song.id, kind: "song_quiz", score: quizScore, total: total, meta: { percent: percent, stars: stars, attempt: attempts, passed: passed } });
      } catch (e) {}
    }
    var res = { score: quizScore, total: total, percent: percent, stars: stars, attempts: attempts, passed: passed, at: Date.now() };
    var detail = "퀴즈 " + percent + "%  ·  Try " + attempts;
    if (passed || attempts >= 2) {
      markDone("quiz", res);
      stageDoneScreen("quiz", quizScore + " / " + total, passed ? (stars >= 3 ? "Wow! Super star!" : "Great job! You passed!") : "Try again with your teacher", detail);
      $("btn-again").hidden = true;
    } else {
      try { saveScore({ percent: percent, stars: stars, screen: "quiz", wordId: "quiz_try1", at: Date.now() }); } catch (e) {}
      stageDoneScreen("quiz", quizScore + " / " + total, "Almost! Try one more time.", detail + " · Need 3 / 5");
      $("btn-again").hidden = false;
      $("btn-again").textContent = "Try quiz again";
    }
    $("score-stars").textContent = starString(stars);
  }

  /* ---------- loop + wiring ---------- */
  function onTime() {
    if (!song || paused) return;
    var t = audio.currentTime || 0;
    if (mode === "listen") {
      if (ended) return;
      syncListen(t);
      var dur = (isFinite(audio.duration) && audio.duration > 1) ? audio.duration : (song.duration || 0);
      if (audio.ended || (dur > 1 && t >= dur - 0.12)) finishListen();
      return;
    }
    tickSlice(t);
    if ((mode === "practice" || mode === "tap") && slice && slice.armed) {
      renderLine(lineIdx);
      if (!slice.noPaint) paintWords(t, lineIdx);
    }
  }
  function loop() {
    onTime();
    raf = requestAnimationFrame(loop);
  }
  function togglePause() {
    if (mode !== "listen") return;
    paused = !paused;
    if (paused) { pauseAudio(); $("btn-pause").textContent = "Play"; }
    else { $("btn-pause").textContent = "Pause"; playAudio(); }
  }

  $("btn-listen").addEventListener("click", beginListen);
  $("btn-tap-stage").addEventListener("click", function () { if (isUnlocked("tap")) startTapLine(0); });
  $("btn-practice").addEventListener("click", function () { if (isUnlocked("practice")) startPracticeLine(0); });
  $("btn-quiz").addEventListener("click", beginQuiz);
  $("btn-pause").addEventListener("click", togglePause);
  $("btn-prev").addEventListener("click", function () {
    if (mode !== "practice" || uPos === 0) return;
    startPracticeLine(uPos - 1);
  });
  $("btn-next").addEventListener("click", function () {
    if (mode !== "practice" || practiceRep < 3) return;
    startPracticeLine(uPos + 1);
  });
  $("btn-again").addEventListener("click", function () {
    var nx = nextStage() || "quiz";
    if (nx === "listen") beginListen();
    else if (nx === "tap") startTapLine(0);
    else if (nx === "practice") startPracticeLine(0);
    else beginQuiz();
  });
  $("btn-stages").addEventListener("click", goReady);
  $("btn-home").addEventListener("click", function () { stopSlice(); pauseAudio(); });
  audio.addEventListener("ended", function () {
    if (mode === "listen") finishListen();
    else tickSlice(audio.currentTime || 0);
  });
  audio.addEventListener("error", function () {
    showError("Could not play the music. Tap a button to try again.");
  });

  function startSong() {
    if (songStarted) return;
    songStarted = true;
    var id = songIdFromUrl();
    if (!id) {
      showError("Missing song. Go back and pick one.");
      $("panel-ready").hidden = true;
      return;
    }
    fetch("data/" + id + ".json", { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error("song"); return res.json(); })
      .then(function (data) {
        if (!data || !data.lines || !data.lines.length) throw new Error("empty");
        song = data;
        buildUniq();
        document.title = (song.title || "Song") + " · Songs";
        $("song-title").textContent = song.title || "Song";
        $("ready-title").textContent = song.title || "Song";
        $("ready-sub").textContent = (song.book || "") + (song.unitTitle ? " · Unit " + song.unit + " · " + song.unitTitle : "");
        audio.src = song.audio;
        audio.load();
        goReady();
        loop();
      })
      .catch(function () {
        showError("Could not load this song.");
        $("panel-ready").hidden = true;
      });
  }

  window.addEventListener("mrj-auth-ready", function (event) {
    var detail = event && event.detail ? event.detail : {};
    authId = String(detail.id == null ? "" : detail.id).trim();
    startSong();
  });
})();
