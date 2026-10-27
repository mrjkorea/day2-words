(function () {
  "use strict";

  function buttons() {
    if (!window.WB || !WB.steps) return [];
    return WB.steps.map(function (s, k) {
      var id = s[0];
      var href =
        id === "climb"
          ? WB.link("climb.html")
          : WB.link("play.html", "&a=" + id);
      var short = s[1].split(" ")[0];
      return { label: k + 1 + " " + short, href: href };
    });
  }

  function wire() {
    if (!window.MRJTeacherUnlock) return;
    MRJTeacherUnlock.setJumpButtons(buttons());
  }

  document.addEventListener("mrj-auth-ready", wire);
  document.addEventListener("mrj-teacher", function () {
    wire();
    if (/index\.html$/.test(location.pathname) || /\/day3\/?$/.test(location.pathname)) {
      location.reload();
    }
  });
})();
