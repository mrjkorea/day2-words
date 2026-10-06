(function (root) {
  "use strict";

  var LOCAL_BUILD = root.WM_BUILD_ID || "";
  var CHECK_MS = 3 * 60 * 1000;
  var timer = null;

  function check() {
    if (!LOCAL_BUILD) return;
    var url = "version.json?_=" + Date.now();
    fetch(url, { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var remote = data && data.build ? String(data.build) : "";
        if (!remote || remote === LOCAL_BUILD) return;
        var msg = "Day 2 Words has an update. Reload now so your words save correctly?";
        if (root.confirm && root.confirm(msg)) {
          root.location.reload();
        }
      })
      .catch(function () {});
  }

  function arm() {
    if (timer) return;
    timer = setInterval(check, CHECK_MS);
    if (root.addEventListener) {
      root.addEventListener("focus", check);
      root.addEventListener("visibilitychange", function () {
        if (!root.document || root.document.visibilityState === "visible") check();
      });
    }
    setTimeout(check, 15000);
  }

  if (root.document && root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", arm);
  } else {
    arm();
  }
})(window);
