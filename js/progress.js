(function (root) {
  "use strict";

  // Day 2 Words: same payload as Word Master. Sent as text/plain so a Google Apps Script
  // web app can read it without a CORS preflight. If no endpoint is set, sign-in and
  // saving still work on this device only.
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

  function save(payload) {
    var body = fields(payload);
    if (!body.action) body.action = "save";
    writeLocal(body);
    return postRemote(body);
  }

  function load(payload) {
    var body = fields(payload || readLocal() || {});
    body.action = "load";
    return postRemote(body);
  }

  root.MRJ_WM_progress = { save: save, load: load };
})(window);
