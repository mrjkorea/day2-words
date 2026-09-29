(function (root) {
  "use strict";

  // Day 2 Words: same payload as Word Master. Sent as text/plain so a Google Apps Script
  // web app can read it without a CORS preflight. Scores use the shared sign-in id.
  // An empty id is kept on this device and is not posted.
  var LS_KEY = "mrj.day2words.progress";

  function fields(payload) {
    var p = payload || {};
    return {
      action: p.action || "",
      name: p.name || "",
      pin: p.pin || "",
      pack_id: p.pack_id || "",
      pack_title: p.pack_title || "",
      screen: p.screen || "",
      word_id: p.word_id || "",
      study_size: p.study_size || 0,
      locale: p.locale || "",
      student_id: p.student_id || "",
      progress_json: p.progress_json || "",
    };
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
    var url = root.WM_PROGRESS_URL;
    var body = fields(payload);
    if (!url) {
      return Promise.resolve({ ok: true, found: false, local: true });
    }
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
    }).then(function (res) {
      return res.json();
    });
  }

  // Jay 28SEP2026: also write the finished item into the ONE score book.
  function toOneBook(payload) {
    var p = payload || {};
    var student = String(p.student_id || "").trim();
    if (!student) return Promise.resolve(null);
    var prog = null;
    try { prog = JSON.parse(p.progress_json || "null"); } catch (e) {}
    var known = (prog && (prog.known || prog.correct || prog.knownCount)) || 0;
    var total = (prog && (prog.total || prog.studySize)) || p.study_size || 0;
    if (!window.MRJ_SCORES || !total) return Promise.resolve(null);
    return window.MRJ_SCORES.post({
      student: student,
      program: "day2-words",
      appName: "MRJ Day 2 Words",
      source: "day2-words",
      bookTitle: p.pack_title || "",
      unitTitle: p.pack_id || "",
      itemId: [p.pack_id || "pack", p.screen || "screen", p.word_id || ""].join(":"),
      itemType: "word_study",
      scoreValue: known,
      scoreMax: total,
      localDate: new Date()
    });
  }

  function save(payload) {
    var body = fields(payload);
    if (!body.action) body.action = "save";
    writeLocal(body);
    if (!String(body.student_id || "").trim()) {
      return Promise.resolve({ ok: true, skipped: true });
    }
    try { toOneBook(body); } catch (e) {}
    return postRemote(body);
  }

  function load(payload) {
    var body = fields(payload || readLocal() || {});
    body.action = "load";
    return postRemote(body);
  }

  root.MRJ_WM_progress = { save: save, load: load };
})(window);
