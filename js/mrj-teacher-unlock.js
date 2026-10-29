/**
 * Teacher jump tools for MRJ apps. Unlock only via mrj-auth (.mrj-auth-teacher-btn);
 * listens for MRJ_AUTH.isTeacher() and mrj-teacher — no duplicate PIN UI here.
 */
(function (root) {
  "use strict";

  var jumpBarEl = null;
  var jumpButtons = null;

  function auth() {
    return root.MRJ_AUTH || root.MRJSignin || null;
  }

  function isMrjTeacher() {
    try {
      var api = auth();
      return !!(api && typeof api.isTeacher === "function" && api.isTeacher());
    } catch (e) {
      return false;
    }
  }

  function isUnlocked() {
    return isMrjTeacher();
  }

  function installRefresh(onRefresh) {
    if (!root.document || typeof onRefresh !== "function") return;
    root.document.addEventListener("mrj-teacher", function () {
      try {
        onRefresh();
      } catch (e) {}
    });
    if (isUnlocked()) {
      try {
        onRefresh();
      } catch (e) {}
    }
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
    var show = isUnlocked() && jumpButtons && jumpButtons.length;
    jumpBarEl.hidden = !show;
    root.document.body.classList.toggle("mrj-teacher-jump-on", !!show);
    root.document.body.classList.toggle("mrj-teacher-unlock-active", isUnlocked());
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

  function refreshUnlockState() {
    syncJumpBar();
  }

  root.MRJTeacherUnlock = {
    isMrjTeacher: isMrjTeacher,
    isUnlocked: isUnlocked,
    installRefresh: installRefresh,
    setJumpButtons: setJumpButtons,
    mount: function () {},
    lock: function () {
      syncJumpBar();
    },
  };

  if (root.document) {
    root.document.addEventListener("mrj-auth-ready", function () {
      setTimeout(refreshUnlockState, 60);
    });
    root.document.addEventListener("mrj-teacher", refreshUnlockState);
    if (root.document.readyState !== "loading") {
      setTimeout(refreshUnlockState, 200);
    } else {
      root.document.addEventListener("DOMContentLoaded", function () {
        setTimeout(refreshUnlockState, 200);
      });
    }
  }
})(typeof window !== "undefined" ? window : this);
