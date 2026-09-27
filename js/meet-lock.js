/**
 * Meet the Words lock.
 * batchIds creates a new lock only. Later activities must use wordsForLock.
 */
(function (root, factory) {
  var api = factory();
  if (root) root.MeetLock = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function () {
  function batchIds(words, intro, winsA, winsB, winsC, n, need) {
    words = words || [];
    intro = intro || {};
    winsA = winsA || {};
    winsB = winsB || {};
    winsC = winsC || {};
    need = need == null ? 2 : need;
    var limit = n == null ? 10 : n;
    var undone = words.filter(function (w) {
      if (!w || w.id == null) return false;
      var id = w.id;
      var missingIntro = !intro[id];
      var a = (winsA[id] || 0) < need;
      var b = (winsB[id] || 0) < need;
      var c = (winsC[id] || 0) < need;
      return missingIntro || a || b || c;
    });
    return undone.slice(0, limit).map(function (w) { return w.id; });
  }

  function lockCleared(wordsById, lockIds, intro, winsA, winsB, winsC, need) {
    lockIds = lockIds || [];
    if (!lockIds.length) return false;
    wordsById = wordsById || {};
    intro = intro || {};
    winsA = winsA || {};
    winsB = winsB || {};
    winsC = winsC || {};
    need = need == null ? 2 : need;
    for (var i = 0; i < lockIds.length; i++) {
      var id = lockIds[i];
      if (!wordsById[id]) return false;
      if (!intro[id]) return false;
      if ((winsA[id] || 0) < need) return false;
      if ((winsB[id] || 0) < need) return false;
      if ((winsC[id] || 0) < need) return false;
    }
    return true;
  }

  function wordsForLock(allWords, lockIds) {
    var byId = {};
    (allWords || []).forEach(function (w) {
      if (w && w.id != null && !Object.prototype.hasOwnProperty.call(byId, w.id)) byId[w.id] = w;
    });
    var out = [];
    (lockIds || []).forEach(function (id) {
      if (byId[id]) out.push(byId[id]);
    });
    return out;
  }

  function outsideLock(activityIds, lockIds) {
    var allowed = {};
    (lockIds || []).forEach(function (id) { allowed[id] = true; });
    return (activityIds || []).filter(function (id) { return !allowed[id]; });
  }

  return {
    batchIds: batchIds,
    lockCleared: lockCleared,
    wordsForLock: wordsForLock,
    outsideLock: outsideLock,
  };
});
