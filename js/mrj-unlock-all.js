/**
 * Jay temporary unlock until proper teacher unlock UI.
 * Set MRJ_TEMP_UNLOCK_ALL = false (or remove this script) to restore path/unit locks.
 */
(function (root) {
  "use strict";

  root.MRJ_TEMP_UNLOCK_ALL = true;

  try {
    if (root.localStorage) root.localStorage.setItem("MRJ_TEMP_UNLOCK_ALL", "1");
  } catch (e) {}

  root.MRJ_pathLocksOpen = function () {
    return !!root.MRJ_TEMP_UNLOCK_ALL;
  };

  var OPEN = { intro: true, A: true, B: true, C: true, games: true, test: true };

  function patchPathLock() {
    var PL = root.PathLock;
    if (!PL || PL.__mrjTempUnlockAll) return;
    var origHold = PL.hold;
    var origCan = PL.can;
    PL.hold = function (set, opts) {
      if (root.MRJ_TEMP_UNLOCK_ALL) return OPEN;
      return origHold.apply(PL, arguments);
    };
    PL.can = function (set, step, opts) {
      if (root.MRJ_TEMP_UNLOCK_ALL) return { ok: true, why: "ok", need: "" };
      return origCan.apply(PL, arguments);
    };
    PL.__mrjTempUnlockAll = true;
  }

  function applyHooks() {
    if (!root.MRJ_TEMP_UNLOCK_ALL) return;
    patchPathLock();
  }

  root.MRJ_applyTempUnlockHooks = applyHooks;

  applyHooks();
  if (root.document) {
    root.document.addEventListener("DOMContentLoaded", applyHooks);
  }
  var tries = 0;
  var poll = setInterval(function () {
    applyHooks();
    tries += 1;
    if (tries > 60) clearInterval(poll);
  }, 50);
})(typeof window !== "undefined" ? window : this);
