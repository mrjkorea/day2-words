(function (root) {
  "use strict";

  var PROGRAM = "word-master";
  var LS_KEY = "mrj.day2words.progress";
  var hydrated = false;
  var loadDone = false;
  var pendingSave = null;
  var retryTimer = null;
  var retryAttempt = 0;
  var lastSaveError = "";

  function authStudentId() {
    if (!root.MRJ_AUTH || typeof root.MRJ_AUTH.student !== "function") return "";
    return String(root.MRJ_AUTH.student() || "").trim();
  }

  function authToken() {
    if (!root.MRJ_AUTH || typeof root.MRJ_AUTH.token !== "function") return "";
    return String(root.MRJ_AUTH.token() || "").trim();
  }

  function endpoint() {
    if (root.MRJ_AUTH && root.MRJ_AUTH.ENDPOINT) return root.MRJ_AUTH.ENDPOINT;
    if (root.WM_SIGNIN_URL) return root.WM_SIGNIN_URL;
    return "";
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocal(payload) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload || {}));
    } catch (e) {}
  }

  function postRemote(payload) {
    var url = endpoint();
    if (!url) return Promise.resolve({ ok: false, error: "no_endpoint" });
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    }).then(function (res) {
      return res.json().catch(function () {
        return { ok: false, error: "bad_json" };
      });
    });
  }

  function dispatchSaveStatus(ok, detail) {
    try {
      if (!root.dispatchEvent) return;
      root.dispatchEvent(
        new CustomEvent("mrj-wm-save-status", {
          detail: { ok: !!ok, error: detail && detail.error ? String(detail.error) : "" },
        })
      );
    } catch (e) {}
  }

  function countKnownInProgress(progressJson) {
    var prog = null;
    try {
      prog = typeof progressJson === "string" ? JSON.parse(progressJson) : progressJson;
    } catch (e) {
      return { known: 0, total: 0 };
    }
    if (!prog || !prog.sets) return { known: 0, total: 0 };
    var known = 0;
    var total = 0;
    Object.keys(prog.sets).forEach(function (pid) {
      var s = prog.sets[pid] || {};
      var ids = Array.isArray(s.meetLock) && s.meetLock.length
        ? s.meetLock
        : Object.keys(s.intro || {});
      ids.forEach(function (id) {
        total += 1;
        var passed = (s.testPassed || {})[id];
        if (passed != null && Number(passed) >= 80) {
          known += 1;
          return;
        }
        var intro = (s.intro || {})[id];
        if (!intro) return;
        var wa = (s.winsA || {})[id] || 0;
        var wb = (s.winsB || {})[id] || 0;
        var wc = (s.winsC || {})[id] || 0;
        if (wa >= 2 && wb >= 2 && wc >= 2) known += 1;
      });
    });
    return { known: known, total: total };
  }

  function maybePostScore(payload) {
    var p = payload || {};
    if (p.scoreKind === "known" || p.scoreKind === "checkup") {
      var value = Number(p.scoreValue);
      var max = Number(p.scoreMax);
      if (!isFinite(value) || !isFinite(max) || !(max > 0)) return Promise.resolve(null);
      var student = authStudentId();
      if (!student) return Promise.resolve(null);
      var itemId = [p.pack_id || "pack", p.scoreKind, p.pack_id || ""].join(":");
      if (root.MRJ_AUTH && typeof root.MRJ_AUTH.noteScore === "function") {
        return root.MRJ_AUTH.noteScore({
          program: "day2-words",
          itemId: itemId,
          scoreValue: value,
          scoreMax: max,
        }).catch(function () {
          return null;
        });
      }
      if (!window.MRJ_SCORES) return Promise.resolve(null);
      return window.MRJ_SCORES.post({
        student: student,
        program: "day2-words",
        appName: "MRJ Day 2 Words",
        source: "day2-words",
        bookTitle: p.pack_title || "",
        unitTitle: p.pack_id || "",
        itemId: itemId,
        itemType: p.scoreKind === "checkup" ? "checkup" : "word_study",
        scoreValue: value,
        scoreMax: max,
      });
    }
    return Promise.resolve(null);
  }

  function clearRetryTimer() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function scheduleRetry(body) {
    clearRetryTimer();
    retryAttempt += 1;
    var delay = Math.min(30000, 2000 * Math.pow(2, Math.min(retryAttempt, 4)));
    retryTimer = setTimeout(function () {
      retryTimer = null;
      flushSave(body);
    }, delay);
  }

  function flushSave(body) {
    if (!body) return Promise.resolve(null);
    var id = authStudentId();
    var token = authToken();
    if (!id || !token) {
      dispatchSaveStatus(false, { error: "no_auth" });
      return Promise.resolve({ ok: false, error: "no_auth" });
    }
    if (!loadDone) {
      pendingSave = body;
      return Promise.resolve({ ok: false, error: "not_loaded" });
    }
    var req = {
      action: "save_pack",
      id: id,
      token: token,
      program: PROGRAM,
      progress_json: body.progress_json || "{}",
    };
    return postRemote(req).then(function (res) {
      var ok = !!(res && res.ok && res.saved !== false && !res.error);
      if (ok) {
        retryAttempt = 0;
        lastSaveError = "";
        writeLocal(body);
        dispatchSaveStatus(true, res);
        return res;
      }
      lastSaveError = (res && res.error) || "save_failed";
      dispatchSaveStatus(false, res);
      scheduleRetry(body);
      return res;
    }).catch(function () {
      lastSaveError = "network";
      dispatchSaveStatus(false, { error: "network" });
      scheduleRetry(body);
      return { ok: false, error: "network" };
    });
  }

  function save(payload) {
    var id = authStudentId();
    if (!id) return Promise.resolve(null);
    var body = payload || {};
    if (!body.progress_json) return Promise.resolve(null);
    try {
      maybePostScore(body);
    } catch (e) {}
    pendingSave = body;
    return flushSave(body);
  }

  function load() {
    var id = authStudentId();
    var token = authToken();
    if (!id || !token) {
      return Promise.resolve({ ok: false, error: "no_auth" });
    }
    hydrated = false;
    loadDone = false;
    return postRemote({
      action: "load_pack",
      id: id,
      token: token,
      program: PROGRAM,
    }).then(function (res) {
      loadDone = true;
      hydrated = true;
      if (pendingSave && pendingSave.progress_json) {
        var snap = pendingSave;
        pendingSave = null;
        flushSave(snap);
      }
      return res;
    }).catch(function () {
      loadDone = true;
      hydrated = false;
      dispatchSaveStatus(false, { error: "load_failed" });
      return { ok: false, error: "load_failed" };
    });
  }

  function resetSession() {
    hydrated = false;
    loadDone = false;
    pendingSave = null;
    retryAttempt = 0;
    lastSaveError = "";
    clearRetryTimer();
  }

  function isReadyToSave() {
    return loadDone && !!authStudentId() && !!authToken();
  }

  root.MRJ_WM_progress = {
    save: save,
    load: load,
    resetSession: resetSession,
    isReadyToSave: isReadyToSave,
    merge: root.MRJ_WM_merge,
    countKnownInProgress: countKnownInProgress,
    lastSaveError: function () { return lastSaveError; },
  };
})(window);
