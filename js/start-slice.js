/**
 * Word-group boundaries for teacher "start from here" (same rules as Word Master).
 * Student ranges start at 1, 6, 11, … (every 5 words).
 */
(function (root) {
  "use strict";
  var GROUP = 5;

  function alignedStart(startNumber) {
    var start = Math.floor(Number(startNumber));
    if (!(start >= 1)) return 1;
    return Math.floor((start - 1) / GROUP) * GROUP + 1;
  }

  function sliceFrom(words, startNumber, count) {
    words = Array.isArray(words) ? words : [];
    var total = words.length;
    var start = alignedStart(startNumber);
    var n = Math.floor(Number(count));
    if (!(n >= 0)) n = 0;
    if (!total) return { startNumber: start, ids: [], words: [] };
    if (start > total) start = total;
    var slice = words.slice(start - 1, start - 1 + n);
    return {
      startNumber: start,
      ids: slice.map(function (w) {
        return w.id;
      }),
      words: slice,
    };
  }

  root.MRJ_StartSlice = {
    GROUP: GROUP,
    alignedStart: alignedStart,
    sliceFrom: sliceFrom,
  };
})(typeof window !== "undefined" ? window : this);
