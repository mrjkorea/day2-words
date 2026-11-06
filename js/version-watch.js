(function (root) {
  "use strict";
  // New-version notice for a cached page.
  // Jay 2026-11-06: the old confirm() asked again and again and a reload did not clear it,
  // because the phone kept serving the same cached HTML. Two rules now:
  //   1. The notice is a small bar with Reload and Later. Later stops it for 6 hours.
  //   2. Reload adds ?_v=<build> to the URL, so the browser must fetch a fresh page.
  var LOCAL_BUILD = root.WM_BUILD_ID || root.D5_BUILD_ID || "";
  var CHECK_MS = 3 * 60 * 1000;
  var PROMPT_GAP_MS = 10 * 60 * 1000;
  var SNOOZE_MS = 6 * 60 * 60 * 1000;
  var SNOOZE_KEY = "mrj.updbar.snooze";
  var GAP_KEY = "mrj.updbar.last";
  var cur = root.document && root.document.currentScript;
  var BASE = "version.json";
  try { if (cur && cur.src) BASE = new URL("../version.json", cur.src).href; } catch (e) {}
  var timer = null;

  function rd(k) { try { return root.localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function wr(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }

  function snoozed() {
    var until = +(rd(SNOOZE_KEY).split(":")[0] || 0);
    return Date.now() < until;
  }
  function gapOk() {
    var last = +(rd(GAP_KEY) || 0);
    if (last && Date.now() - last < PROMPT_GAP_MS) return false;
    wr(GAP_KEY, String(Date.now()));
    return true;
  }

  function reloadNow(remote) {
    try {
      var u = new URL(root.location.href);
      u.searchParams.set("_v", remote || String(Date.now()));
      root.location.replace(u.toString());
    } catch (e) {
      try { root.location.reload(); } catch (e2) {}
    }
  }

  function showBar(remote) {
    var doc = root.document;
    if (!doc || !doc.body) return;
    var old = doc.getElementById("mrj-update-bar");
    if (old) return;
    var bar = doc.createElement("div");
    bar.id = "mrj-update-bar";
    bar.setAttribute("role", "status");
    bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;align-items:center;" +
      "gap:10px;justify-content:space-between;padding:10px 12px;background:#fff8ec;border-top:3px solid #f0b27f;" +
      "color:#1f2a44;font:600 15px/1.35 system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;" +
      "box-shadow:0 -6px 18px rgba(0,0,0,.14)";
    var txt = doc.createElement("span");
    txt.textContent = "New version ready. Reload so your work saves.";
    txt.style.cssText = "flex:1;min-width:0";
    var later = doc.createElement("button");
    later.type = "button";
    later.textContent = "Later";
    later.setAttribute("aria-label", "Close the update notice");
    later.style.cssText = "flex:0 0 auto;min-height:44px;padding:8px 14px;border-radius:12px;border:2px solid #e0752d;" +
      "background:#fff;color:#c25b12;font:800 15px system-ui,sans-serif";
    later.onclick = function () {
      wr(SNOOZE_KEY, String(Date.now() + SNOOZE_MS) + ":" + (remote || ""));
      if (bar.parentNode) bar.parentNode.removeChild(bar);
    };
    var go = doc.createElement("button");
    go.type = "button";
    go.textContent = "Reload";
    go.style.cssText = "flex:0 0 auto;min-height:44px;padding:8px 16px;border-radius:12px;border:0;" +
      "background:#2f7cf6;color:#fff;font:800 15px system-ui,sans-serif";
    go.onclick = function () { reloadNow(remote); };
    bar.appendChild(txt);
    bar.appendChild(later);
    bar.appendChild(go);
    doc.body.appendChild(bar);
  }

  function check() {
    if (!LOCAL_BUILD || snoozed()) return;
    fetch(BASE + "?_=" + Date.now(), { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var remote = data && data.build ? String(data.build) : "";
        if (!remote || remote === LOCAL_BUILD) return;
        if (!gapOk()) return;
        showBar(remote);
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
