/**
 * Teacher "start from here" for Day 2 Words (+ Day 3 paths in this repo).
 * Teacher session: mrj-auth chip only (.mrj-auth-teacher-btn → MRJ_AUTH.isTeacher / mrj-teacher).
 * Section open if MRJ_TEMP_UNLOCK_ALL (see js/mrj-unlock-all.js) OR student progress OR teacherUnlock in progress_json.
 */
(function (root) {
  "use strict";

  var BUILD = "20261103-day2-teacher-save";
  var PACK_BASE = "https://mrjkorea.github.io/day2-words/packs/";
  var STUDY_SIZES = [5, 10, 15, 20];
  var SONG_STAGES = ["listen", "tap", "practice", "quiz"];
  var PATH_STEPS = ["intro", "A", "B", "C", "games", "test"];

  var jumpBarEl = null;
  var jumpButtons = null;
  var panelEl = null;
  var toolsBtnEl = null;
  var panelOpen = false;
  var cachedProgress = null;
  var progressLoading = null;
  var sectionRegistry = [];
  var paintToken = 0;

  var BOOK_NAMES = {
    basic_a: "Basic A",
    basic_b: "Basic B",
    basic_c: "Basic C",
    int2a: "INT 2A",
    int2b: "INT 2B",
    int2c: "INT 2C",
    int3a: "INT 3A",
    int3b: "INT 3B",
    int3c: "INT 3C",
  };

  function auth() {
    return root.MRJ_AUTH || root.MRJSignin || null;
  }

  function studentId() {
    try {
      var a = auth();
      return a && a.student ? String(a.student() || "").trim() : "";
    } catch (e) {
      return "";
    }
  }

  function isTeacherSession() {
    try {
      var a = auth();
      return !!(a && typeof a.isTeacher === "function" && a.isTeacher());
    } catch (e) {
      return false;
    }
  }

  function tempUnlockAll() {
    try {
      return !!root.MRJ_TEMP_UNLOCK_ALL;
    } catch (e) {
      return false;
    }
  }

  /** Teacher session active (shows tools). Not the same as "section open for student". */
  function isUnlocked() {
    return isTeacherSession();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function parseProgress(raw) {
    if (!raw) return { v: 1, sets: {}, teacherUnlock: { units: {}, songs: {}, day3: {} } };
    var p = raw;
    if (typeof p === "string") {
      try {
        p = JSON.parse(p);
      } catch (e) {
        p = null;
      }
    }
    if (!p || typeof p !== "object") {
      return { v: 1, sets: {}, teacherUnlock: { units: {}, songs: {}, day3: {} } };
    }
    if (!p.teacherUnlock || typeof p.teacherUnlock !== "object") {
      p.teacherUnlock = { units: {}, songs: {}, day3: {} };
    }
    if (!p.teacherUnlock.units) p.teacherUnlock.units = {};
    if (!p.teacherUnlock.songs) p.teacherUnlock.songs = {};
    if (!p.teacherUnlock.day3) p.teacherUnlock.day3 = {};
    if (!p.sets) p.sets = {};
    return p;
  }

  function teacherLocalKey() {
    var id = studentId();
    return id ? "mrj.day2words.teacherUnlock." + id : "";
  }

  function readLocalTeacher() {
    var key = teacherLocalKey();
    if (!key || !root.localStorage) return null;
    try {
      var raw = root.localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocalTeacher(teacherUnlock) {
    var key = teacherLocalKey();
    if (!key || !root.localStorage) return;
    try {
      root.localStorage.setItem(key, JSON.stringify(teacherUnlock || { units: {}, songs: {}, day3: {} }));
    } catch (e) {}
  }

  function orFlags(a, b) {
    var out = {};
    a = a && typeof a === "object" ? a : {};
    b = b && typeof b === "object" ? b : {};
    Object.keys(a).forEach(function (k) {
      if (a[k]) out[k] = true;
    });
    Object.keys(b).forEach(function (k) {
      if (b[k]) out[k] = true;
    });
    return out;
  }

  function orNested(a, b) {
    var out = {};
    a = a && typeof a === "object" ? a : {};
    b = b && typeof b === "object" ? b : {};
    Object.keys(a).forEach(function (k) {
      out[k] = orFlags(a[k], null);
    });
    Object.keys(b).forEach(function (k) {
      out[k] = orFlags(out[k], b[k]);
    });
    return out;
  }

  /** This browser's last teacher edit wins, then any server flags it does not name. */
  function applyLocalTeacher(prog) {
    var local = readLocalTeacher();
    if (!local) return prog;
    var server = prog.teacherUnlock || {};
    if (local.units || local.songs || local.day3) {
      prog.teacherUnlock = {
        units: local.units && typeof local.units === "object" ? local.units : orFlags(server.units, null),
        songs: local.songs && typeof local.songs === "object" ? local.songs : orNested(server.songs, null),
        day3: local.day3 && typeof local.day3 === "object" ? local.day3 : orNested(server.day3, null),
      };
    }
    return prog;
  }

  function loadProgress(force) {
    if (!force && cachedProgress) return Promise.resolve(cachedProgress);
    if (progressLoading) return progressLoading;
    var progApi = root.MRJ_WM_progress;
    if (!studentId() || !progApi || typeof progApi.load !== "function") {
      cachedProgress = applyLocalTeacher(parseProgress(null));
      return Promise.resolve(cachedProgress);
    }
    progressLoading = progApi
      .load()
      .then(function (res) {
        progressLoading = null;
        var loadFailed = !res || res.ok === false || (res.ok !== true && res.error);
        if (loadFailed) {
          if (!cachedProgress) cachedProgress = applyLocalTeacher(parseProgress(null));
          cachedProgress.__mrjLoadFailed = true;
          return cachedProgress;
        }
        var raw = res.progress_json ? res.progress_json : null;
        cachedProgress = applyLocalTeacher(parseProgress(raw));
        delete cachedProgress.__mrjLoadFailed;
        return cachedProgress;
      })
      .catch(function () {
        progressLoading = null;
        if (!cachedProgress) cachedProgress = applyLocalTeacher(parseProgress(null));
        cachedProgress.__mrjLoadFailed = true;
        return cachedProgress;
      });
    return progressLoading;
  }

  function progressForSave(progress) {
    if (!progress || !progress.__mrjLoadFailed) return progress;
    var copy = {};
    Object.keys(progress).forEach(function (k) {
      if (k !== "__mrjLoadFailed") copy[k] = progress[k];
    });
    return copy;
  }

  function saveProgress(progress) {
    cachedProgress = progress;
    writeLocalTeacher(progress && progress.teacherUnlock);
    var progApi = root.MRJ_WM_progress;
    if (!studentId() || !progApi || typeof progApi.save !== "function") {
      return Promise.resolve({ ok: false, error: "no_save" });
    }
    var body = progressForSave(progress);
    return progApi.save({ progress_json: JSON.stringify(body) }).then(function (res) {
      return res || { ok: false, error: "no_save" };
    });
  }

  function invalidateProgress() {
    cachedProgress = null;
    progressLoading = null;
  }

  /**
   * Reload so a save does not clobber newer set scores, then apply fn and write.
   * Paint from the mutated copy — do not drop the cache and reload again, or the
   * panel paints the pre-save server copy ("No teacher unlocks saved yet").
   */
  function commitTeacherEdit(fn) {
    return loadProgress(true).then(function (prog) {
      fn(prog);
      cachedProgress = prog;
      writeLocalTeacher(prog.teacherUnlock);
      paintPanelList();
      if (prog.__mrjLoadFailed) {
        return { ok: false, error: "load_failed" };
      }
      return saveProgress(prog);
    });
  }

  function packIdFromUnit(unitId) {
    return String(unitId || "").trim();
  }

  function unitNumber(unitId) {
    var m = /_u(\d+)$/.exec(String(unitId || ""));
    return m ? Number(m[1]) : 0;
  }

  function prevUnitId(unitId) {
    var n = unitNumber(unitId);
    if (n <= 1) return "";
    return String(unitId).replace(/_u\d+$/, "_u" + (n - 1));
  }

  function packHasAnyProgress(prog, packId) {
    var s = prog.sets && prog.sets[packId];
    if (!s) return false;
    if (root.MRJ_WM_packProgressEmpty) return !root.MRJ_WM_packProgressEmpty(s);
    return !!(s.lastPlayedAt || (s.intro && Object.keys(s.intro).length));
  }

  function unitNaturallyOpen(prog, unitId) {
    var n = unitNumber(unitId);
    if (n <= 1) return true;
    var prev = prevUnitId(unitId);
    if (!prev) return true;
    return packHasAnyProgress(prog, prev);
  }

  function teacherUnitOpen(prog, unitId) {
    return !!(prog.teacherUnlock.units && prog.teacherUnlock.units[unitId]);
  }

  function unitOpen(prog, unitId) {
    if (tempUnlockAll()) return true;
    return unitNaturallyOpen(prog, unitId) || teacherUnitOpen(prog, unitId);
  }

  function teacherSongStageOpen(prog, songId, stage) {
    var bag = prog.teacherUnlock.songs && prog.teacherUnlock.songs[songId];
    return !!(bag && bag[stage]);
  }

  function teacherDay3Open(prog, unitId, stepId) {
    var bag = prog.teacherUnlock.day3 && prog.teacherUnlock.day3[unitId];
    return !!(bag && bag[stepId]);
  }

  function day3LocalTeacherOpen(unitId, stepId) {
    try {
      var key = "mrj_day3_" + unitId;
      var p = JSON.parse(root.localStorage.getItem(key) || "{}");
      return !!(p.teacherOpen && p.teacherOpen[stepId]);
    } catch (e) {
      return false;
    }
  }

  function writeDay3LocalTeacher(unitId, stepId, on) {
    try {
      var key = "mrj_day3_" + unitId;
      var p = JSON.parse(root.localStorage.getItem(key) || "{}");
      p.teacherOpen = p.teacherOpen || {};
      if (on) p.teacherOpen[stepId] = true;
      else delete p.teacherOpen[stepId];
      root.localStorage.setItem(key, JSON.stringify(p));
    } catch (e) {}
  }

  function alignedStart(n) {
    if (root.MRJ_StartSlice && root.MRJ_StartSlice.alignedStart) {
      return root.MRJ_StartSlice.alignedStart(n);
    }
    var start = Math.floor(Number(n));
    if (!(start >= 1)) return 1;
    return Math.floor((start - 1) / 5) * 5 + 1;
  }

  function fetchPack(packId) {
    return fetch(PACK_BASE + encodeURIComponent(packId) + ".json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("pack");
      return r.json();
    });
  }

  function applyPackStart(prog, packId, startNumber, studySize) {
    var set = prog.sets[packId] || {};
    var words = (set.words && set.words.length && set.words) || null;
    var size = STUDY_SIZES.indexOf(Number(studySize)) >= 0 ? Number(studySize) : Number(prog.studySize) || 10;
    var start = alignedStart(startNumber);
    return (words
      ? Promise.resolve(words)
      : fetchPack(packId).then(function (pack) {
          return pack.words || [];
        })
    ).then(function (wlist) {
      var sliceFn = root.MRJ_StartSlice && root.MRJ_StartSlice.sliceFrom;
      var slice = sliceFn
        ? sliceFn(wlist, start, size)
        : { startNumber: start, ids: wlist.slice(start - 1, start - 1 + size).map(function (w) { return w.id; }) };
      set.startNumber = slice.startNumber;
      set.meetLock = slice.ids.slice();
      set.lastPlayedAt = Date.now();
      var key = set.meetLock.join(",");
      set.pathHeld = set.pathHeld || {};
      set.pathHeld[key] = set.pathHeld[key] || {};
      PATH_STEPS.slice(0, 5).forEach(function (step) {
        set.pathHeld[key][step] = true;
      });
      prog.sets[packId] = set;
      prog.currentPackId = packId;
      prog.teacherUnlock.units[packId] = true;
      return prog;
    });
  }

  function unlockUnit(unitId) {
    return commitTeacherEdit(function (prog) {
      prog.teacherUnlock.units[unitId] = true;
    });
  }

  function relockUnit(unitId) {
    return commitTeacherEdit(function (prog) {
      delete prog.teacherUnlock.units[unitId];
    });
  }

  function unlockSongStage(songId, stage) {
    return commitTeacherEdit(function (prog) {
      prog.teacherUnlock.songs[songId] = prog.teacherUnlock.songs[songId] || {};
      prog.teacherUnlock.songs[songId][stage] = true;
      SONG_STAGES.forEach(function (st) {
        var i = SONG_STAGES.indexOf(st);
        var j = SONG_STAGES.indexOf(stage);
        if (i >= 0 && j >= 0 && i <= j) prog.teacherUnlock.songs[songId][st] = true;
      });
    });
  }

  function relockSong(songId) {
    return commitTeacherEdit(function (prog) {
      delete prog.teacherUnlock.songs[songId];
    });
  }

  function unlockDay3Step(unitId, stepId) {
    writeDay3LocalTeacher(unitId, stepId, true);
    return commitTeacherEdit(function (prog) {
      prog.teacherUnlock.day3[unitId] = prog.teacherUnlock.day3[unitId] || {};
      prog.teacherUnlock.day3[unitId][stepId] = true;
    });
  }

  function relockDay3Step(unitId, stepId) {
    writeDay3LocalTeacher(unitId, stepId, false);
    return commitTeacherEdit(function (prog) {
      if (prog.teacherUnlock.day3[unitId]) delete prog.teacherUnlock.day3[unitId][stepId];
    });
  }

  function unlockPackFromWordGroup(packId, startNumber) {
    return loadProgress(true).then(function (prog) {
      return applyPackStart(prog, packId, startNumber, prog.studySize || 10);
    }).then(function (prog) {
      cachedProgress = prog;
      writeLocalTeacher(prog.teacherUnlock);
      paintPanelList();
      return saveProgress(prog);
    });
  }

  function sectionOpen(spec, prog) {
    if (tempUnlockAll()) return true;
    prog = prog || cachedProgress || parseProgress(null);
    if (!spec || !spec.kind) return true;
    if (spec.kind === "unit") return unitOpen(prog, spec.id);
    if (spec.kind === "songStage") {
      if (spec.naturalOpen) return true;
      return teacherSongStageOpen(prog, spec.songId, spec.stage);
    }
    if (spec.kind === "day3") {
      if (spec.naturalOpen) return true;
      return teacherDay3Open(prog, spec.unitId, spec.stepId) || day3LocalTeacherOpen(spec.unitId, spec.stepId);
    }
    return true;
  }

  function registerSections(list) {
    sectionRegistry = Array.isArray(list) ? list.slice() : [];
    paintSectionDecorations();
  }

  function makeStartBtn(label, onClick) {
    var btn = root.document.createElement("button");
    btn.type = "button";
    btn.className = "mrj-teacher-start-btn";
    btn.textContent = label || "Start from here";
    btn.addEventListener("click", function (ev) {
      if (ev.stopPropagation) ev.stopPropagation();
      if (ev.preventDefault) ev.preventDefault();
      onClick();
    });
    return btn;
  }

  function nodeAlive(node) {
    if (!node) return false;
    if (typeof node.isConnected === "boolean") return node.isConnected;
    return true;
  }

  function clearTeacherButtons(node) {
    if (!node || typeof node.querySelectorAll !== "function") return;
    var old = node.querySelectorAll(".mrj-teacher-start-btn, .mrj-teacher-relock-btn");
    for (var i = 0; i < old.length; i++) {
      if (old[i] && old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    }
  }

  function afterTeacherEdit(spec) {
    paintPanelList();
    paintSectionDecorations();
    if (spec && spec.onDone) spec.onDone();
    try {
      root.document.dispatchEvent(new root.CustomEvent("mrj-teacher-unlock-changed"));
    } catch (e) {}
  }

  function paintSectionDecorations() {
    if (!root.document) return;
    if (!isTeacherSession()) {
      if (root.document.querySelectorAll) {
        var stray = root.document.querySelectorAll(".mrj-teacher-start-btn, .mrj-teacher-relock-btn");
        for (var s = 0; s < stray.length; s++) {
          if (stray[s].parentNode) stray[s].parentNode.removeChild(stray[s]);
        }
      }
      return;
    }
    var token = ++paintToken;
    loadProgress(false).then(function (prog) {
      if (token !== paintToken) return;
      sectionRegistry.forEach(function (spec) {
        if (!spec || !spec.node || !nodeAlive(spec.node)) return;
        clearTeacherButtons(spec.node);
        var open = sectionOpen(spec, prog);
        spec.node.classList.toggle("mrj-teacher-section-open", open);
        spec.node.classList.toggle("mrj-teacher-section-locked", !open);
        var btn = makeStartBtn(spec.buttonLabel || "Start from here", function () {
          var chain = Promise.resolve();
          if (spec.kind === "unit") {
            chain = unlockUnit(spec.id);
            if (spec.startWord) chain = chain.then(function () { return unlockPackFromWordGroup(spec.id, spec.startWord); });
          } else if (spec.kind === "songStage") {
            chain = unlockSongStage(spec.songId, spec.stage);
          } else if (spec.kind === "day3") {
            chain = unlockDay3Step(spec.unitId, spec.stepId);
          }
          chain.then(function () {
            afterTeacherEdit(spec);
          });
        });
        spec.node.appendChild(btn);
        if (open && spec.showRelock) {
          var undo = makeStartBtn("Re-lock", function () {
            var chain = Promise.resolve();
            if (spec.kind === "unit") chain = relockUnit(spec.id);
            else if (spec.kind === "songStage") chain = relockSong(spec.songId);
            else if (spec.kind === "day3") chain = relockDay3Step(spec.unitId, spec.stepId);
            chain.then(function () {
              afterTeacherEdit(spec);
            });
          });
          undo.classList.add("mrj-teacher-relock-btn");
          spec.node.appendChild(undo);
        }
      });
    });
  }

  function unitStartLabel(unitId) {
    var m = /^([a-z0-9_]+)_u(\d+)$/.exec(String(unitId || ""));
    if (!m) return "Unit " + unitId;
    var n = String(Number(m[2]));
    if (n.length < 2) n = "0" + n;
    var book = BOOK_NAMES[m[1]] || m[1];
    return book + ": start at unit" + n;
  }

  function listOpenSections(prog) {
    prog = prog || cachedProgress || parseProgress(null);
    var lines = [];
    Object.keys(prog.teacherUnlock.units || {}).forEach(function (id) {
      if (prog.teacherUnlock.units[id]) {
        lines.push({ kind: "unit", id: id, unitId: id, label: unitStartLabel(id) });
      }
    });
    Object.keys(prog.teacherUnlock.songs || {}).forEach(function (sid) {
      var st = prog.teacherUnlock.songs[sid] || {};
      SONG_STAGES.forEach(function (stage) {
        if (st[stage]) lines.push({ kind: "song", id: sid + " · " + stage, label: sid + " · " + stage });
      });
    });
    Object.keys(prog.teacherUnlock.day3 || {}).forEach(function (uid) {
      var bag = prog.teacherUnlock.day3[uid] || {};
      Object.keys(bag).forEach(function (step) {
        if (bag[step]) lines.push({ kind: "day3", id: uid + " · " + step, label: "Day 3 " + uid + " · " + step });
      });
    });
    Object.keys(prog.sets || {}).forEach(function (pid) {
      var s = prog.sets[pid];
      if (s && Number(s.startNumber) >= 1 && Array.isArray(s.meetLock) && s.meetLock.length) {
        lines.push({
          kind: "words",
          id: pid,
          label: pid + " words from " + s.startNumber + " (" + s.meetLock.length + " words)",
        });
      }
    });
    return lines;
  }

  function paintPanelList() {
    if (!panelEl) return;
    var list = panelEl.querySelector(".mrj-teacher-panel-list");
    if (!list) return;
    loadProgress(false).then(function (prog) {
      var lines = listOpenSections(prog);
      list.innerHTML = "";
      if (!studentId()) {
        list.textContent = "Sign a student in first.";
        return;
      }
      if (!lines.length) {
        list.textContent = "No teacher unlocks saved yet. Tap Start from here on a section.";
        return;
      }
      lines.forEach(function (line) {
        var row = root.document.createElement("div");
        row.className = "mrj-teacher-panel-row";
        var text = root.document.createElement("span");
        text.className = "mrj-teacher-panel-text";
        text.textContent = line.label;
        row.appendChild(text);
        if (line.kind === "unit" && line.unitId) {
          var undo = root.document.createElement("button");
          undo.type = "button";
          undo.className = "mrj-teacher-panel-undo";
          undo.textContent = "Undo";
          undo.addEventListener("click", function (ev) {
            if (ev.stopPropagation) ev.stopPropagation();
            if (ev.preventDefault) ev.preventDefault();
            relockUnit(line.unitId).then(function () {
              afterTeacherEdit(null);
            });
          });
          row.appendChild(undo);
        }
        list.appendChild(row);
      });
    });
  }

  function closePanel() {
    panelOpen = false;
    if (panelEl) panelEl.hidden = true;
  }

  function openPanel() {
    if (!isTeacherSession()) return;
    ensurePanel();
    panelOpen = true;
    panelEl.hidden = false;
    paintPanelList();
    paintSectionDecorations();
  }

  function togglePanel() {
    if (panelOpen) closePanel();
    else openPanel();
  }

  function ensureToolsButton() {
    if (!root.document || toolsBtnEl) return;
    var chip = root.document.getElementById("mrj-auth-chip-chrome") || root.document.querySelector(".mrj-auth-teacher-btn");
    if (!chip || !chip.parentNode) return;
    toolsBtnEl = root.document.createElement("button");
    toolsBtnEl.type = "button";
    toolsBtnEl.className = "mrj-teacher-tools-btn";
    toolsBtnEl.textContent = "Start here";
    toolsBtnEl.title = "Teacher start / unlock panel";
    toolsBtnEl.addEventListener("click", function (ev) {
      if (ev.stopPropagation) ev.stopPropagation();
      togglePanel();
    });
    var teacherBtn = root.document.querySelector(".mrj-auth-teacher-btn");
    if (teacherBtn && teacherBtn.parentNode) {
      teacherBtn.parentNode.insertBefore(toolsBtnEl, teacherBtn.nextSibling);
    } else {
      chip.appendChild(toolsBtnEl);
    }
  }

  function syncToolsButton() {
    ensureToolsButton();
    if (!toolsBtnEl) return;
    toolsBtnEl.hidden = !isTeacherSession();
    if (!isTeacherSession()) closePanel();
  }

  function ensurePanel() {
    if (panelEl || !root.document || !root.document.body) return;
    panelEl = root.document.createElement("div");
    panelEl.id = "mrj-teacher-control-panel";
    panelEl.className = "mrj-teacher-control-panel";
    panelEl.hidden = true;
    panelEl.innerHTML =
      '<div class="mrj-teacher-panel-inner">' +
      '<h2>Teacher · start from here</h2>' +
      '<p class="mrj-teacher-panel-cap">For student <b id="mrj-teacher-panel-student"></b>. Open a section below or use Start from here on each card.</p>' +
      '<div class="mrj-teacher-panel-list"></div>' +
      '<button type="button" class="mrj-teacher-panel-close">Close</button>' +
      "</div>";
    panelEl.querySelector(".mrj-teacher-panel-close").addEventListener("click", closePanel);
    root.document.body.appendChild(panelEl);
  }

  function syncJumpBar() {
    if (!root.document || !root.document.body) return;
    if (!jumpBarEl) {
      jumpBarEl = root.document.createElement("div");
      jumpBarEl.id = "mrj-teacher-jump-bar";
      jumpBarEl.className = "mrj-teacher-jump-bar";
      jumpBarEl.hidden = true;
      root.document.body.appendChild(jumpBarEl);
    }
    var show = isTeacherSession() && jumpButtons && jumpButtons.length;
    jumpBarEl.hidden = !show;
    root.document.body.classList.toggle("mrj-teacher-jump-on", !!show);
    root.document.body.classList.toggle("mrj-teacher-unlock-active", isTeacherSession());
    if (!show) return;
    jumpBarEl.innerHTML = "";
    jumpButtons.forEach(function (b) {
      var btn = root.document.createElement("button");
      btn.type = "button";
      btn.textContent = b.label || "Jump";
      btn.addEventListener("click", function () {
        if (typeof b.onClick === "function") b.onClick();
        else if (b.href) root.location.href = b.href;
      });
      jumpBarEl.appendChild(btn);
    });
  }

  function setJumpButtons(buttons) {
    jumpButtons = Array.isArray(buttons) ? buttons : null;
    syncJumpBar();
  }

  function installRefresh(onRefresh) {
    if (!root.document || typeof onRefresh !== "function") return;
    root.document.addEventListener("mrj-teacher", function () {
      try {
        onRefresh();
      } catch (e) {}
    });
    root.document.addEventListener("mrj-teacher-unlock-changed", function () {
      try {
        onRefresh();
      } catch (e2) {}
    });
    if (isTeacherSession()) {
      try {
        onRefresh();
      } catch (e3) {}
    }
  }

  function refreshUnlockState() {
    syncToolsButton();
    syncJumpBar();
    if (panelEl) {
      var st = panelEl.querySelector("#mrj-teacher-panel-student");
      if (st) st.textContent = studentId() || "—";
    }
    paintSectionDecorations();
    if (panelOpen) paintPanelList();
  }

  function onTeacherEnter() {
    invalidateProgress();
    syncToolsButton();
    openPanel();
    refreshUnlockState();
  }

  root.MRJTeacherUnlock = {
    BUILD: BUILD,
    isMrjTeacher: isTeacherSession,
    isTeacherSession: isTeacherSession,
    isUnlocked: isUnlocked,
    tempUnlockAll: tempUnlockAll,
    sectionOpen: sectionOpen,
    unitOpen: function (unitId, prog) {
      return unitOpen(prog || cachedProgress || parseProgress(null), unitId);
    },
    teacherSongStageOpen: teacherSongStageOpen,
    teacherDay3Open: teacherDay3Open,
    day3LocalTeacherOpen: day3LocalTeacherOpen,
    unlockUnit: unlockUnit,
    unlockPackFromWordGroup: unlockPackFromWordGroup,
    unlockSongStage: unlockSongStage,
    unlockDay3Step: unlockDay3Step,
    loadProgress: loadProgress,
    registerSections: registerSections,
    alignedStart: alignedStart,
    getCachedProgress: function () {
      return cachedProgress || parseProgress(null);
    },
    installRefresh: installRefresh,
    setJumpButtons: setJumpButtons,
    openPanel: openPanel,
    closePanel: closePanel,
    mount: function () {
      ensurePanel();
      ensureToolsButton();
    },
    lock: function () {
      closePanel();
      refreshUnlockState();
    },
  };

  if (root.document) {
    root.document.addEventListener("mrj-auth-ready", function () {
      setTimeout(refreshUnlockState, 80);
    });
    root.document.addEventListener("mrj-teacher", function () {
      onTeacherEnter();
    });
    root.document.addEventListener("mrj-teacher-unlock-changed", refreshUnlockState);
    if (root.document.readyState !== "loading") {
      setTimeout(function () {
        root.MRJTeacherUnlock.mount();
        refreshUnlockState();
      }, 200);
    } else {
      root.document.addEventListener("DOMContentLoaded", function () {
        setTimeout(function () {
          root.MRJTeacherUnlock.mount();
          refreshUnlockState();
        }, 200);
      });
    }
  }
})(typeof window !== "undefined" ? window : this);
