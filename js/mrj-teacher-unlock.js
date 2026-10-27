/**
 * Teacher PIN unlock beside the mrj-signin student chip (study_teacher_check on MRJ_AUTH.ENDPOINT).
 * Honors MRJSignin / MRJ_AUTH.isTeacher() from the server; does not store a second PIN locally.
 */
(function (root) {
  "use strict";

  var pinUnlocked = false;
  var fabEl = null;
  var panelEl = null;
  var jumpBarEl = null;
  var jumpButtons = null;
  var layoutTimer = null;

  function auth() {
    return root.MRJ_AUTH || root.MRJSignin || null;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
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
    return isMrjTeacher() || pinUnlocked;
  }

  function teacherCheck(pin) {
    var a = auth();
    if (a && a.preview) {
      return Promise.resolve(
        a.teacherCheck
          ? a.teacherCheck(pin)
          : { ok: false, message: "Preview has no teacher check." }
      );
    }
    if (!a || !a.ENDPOINT) {
      return Promise.resolve({ ok: false, message: "Sign-in is not loaded." });
    }
    var body = {
      action: "study_teacher_check",
      pin: pin,
      id: a.student && a.student(),
      token: a.token && a.token(),
    };
    return fetch(a.ENDPOINT, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    })
      .then(function (r) {
        return r.json();
      })
      .catch(function () {
        return { ok: false, message: "Network error." };
      })
      .then(function (r) {
        if (r && r.error === "bad_action") {
          return {
            ok: false,
            message: "Teacher check is not on the server yet (deploy backend/teacher-unlock.patch).",
          };
        }
        return r || { ok: false };
      });
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
      } catch (e2) {}
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

  function applyUnlockState(fireEvent) {
    if (root.document && root.document.body) {
      root.document.body.classList.toggle("mrj-teacher-unlock-active", isUnlocked());
    }
    syncFab();
    syncJumpBar();
    if (!fireEvent || !isUnlocked() || !root.document) return;
    try {
      root.document.dispatchEvent(
        new root.CustomEvent("mrj-teacher", {
          detail: { pin: pinUnlocked, server: isMrjTeacher() },
        })
      );
    } catch (e) {
      var ev = root.document.createEvent("Event");
      ev.initEvent("mrj-teacher", true, true);
      root.document.dispatchEvent(ev);
    }
  }

  function positionFab() {
    if (!fabEl) return;
    var chip = root.document.getElementById("mrj-auth-student-chip");
    if (!chip || chip.hidden) {
      fabEl.hidden = true;
      return;
    }
    fabEl.hidden = false;
    var r = chip.getBoundingClientRect();
    fabEl.style.top = r.top + "px";
    fabEl.style.right = Math.max(8, root.innerWidth - r.left + 6) + "px";
    if (panelEl && !panelEl.hidden) {
      panelEl.style.top = r.bottom + 8 + "px";
      panelEl.style.right = Math.max(8, root.innerWidth - r.right) + "px";
    }
  }

  function scheduleLayout() {
    if (layoutTimer) return;
    layoutTimer = setTimeout(function () {
      layoutTimer = null;
      positionFab();
    }, 30);
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.hidden = true;
  }

  function openPinPanel() {
    var a = auth();
    var who = a && a.student && a.student();
    if (!who) {
      root.alert("Sign the student in first.");
      return;
    }
    if (!panelEl) return;
    panelEl.hidden = false;
    panelEl.innerHTML =
      '<h3>🔒 Teacher</h3>' +
      "<p>Student: <b>" +
      esc(who) +
      "</b></p>" +
      '<label class="sr-only" for="mrj-teacher-pin">Teacher PIN</label>' +
      '<input id="mrj-teacher-pin" type="password" autocomplete="off" placeholder="PIN" />' +
      '<p class="mrj-teacher-unlock-err" id="mrj-teacher-unlock-err"></p>' +
      '<div class="mrj-teacher-unlock-acts">' +
      '<button type="button" class="mrj-teacher-unlock-go" id="mrj-teacher-unlock-go">Unlock</button>' +
      '<button type="button" class="mrj-teacher-unlock-x" id="mrj-teacher-unlock-x">✖</button>' +
      "</div>";
    positionFab();
    var pin = panelEl.querySelector("#mrj-teacher-pin");
    var err = panelEl.querySelector("#mrj-teacher-unlock-err");
    panelEl.querySelector("#mrj-teacher-unlock-x").onclick = closePanel;
    pin.focus();
    var go = function () {
      err.textContent = "Checking…";
      teacherCheck(String(pin.value || "").trim()).then(function (r) {
        if (r && r.ok) {
          pinUnlocked = true;
          closePanel();
          applyUnlockState(true);
        } else {
          err.textContent = (r && r.message) || "Wrong PIN.";
        }
      });
    };
    panelEl.querySelector("#mrj-teacher-unlock-go").onclick = go;
    pin.onkeydown = function (e) {
      if (e.key === "Enter") go();
    };
  }

  function onFabClick() {
    if (isUnlocked()) {
      if (panelEl && !panelEl.hidden) closePanel();
      else if (jumpButtons && jumpButtons.length) syncJumpBar();
      return;
    }
    if (panelEl && !panelEl.hidden) closePanel();
    else openPinPanel();
  }

  function syncFab() {
    if (!fabEl) return;
    positionFab();
    if (isUnlocked()) {
      fabEl.textContent = "🔓";
      fabEl.classList.add("open");
      fabEl.setAttribute("aria-label", "Teacher mode on");
    } else {
      fabEl.textContent = "🔒";
      fabEl.classList.remove("open");
      fabEl.setAttribute("aria-label", "Teacher unlock");
    }
  }

  function mountFab() {
    if (fabEl || !root.document || !root.document.body) return;
    fabEl = root.document.createElement("button");
    fabEl.type = "button";
    fabEl.id = "mrj-teacher-unlock-btn";
    fabEl.className = "mrj-teacher-unlock-btn";
    fabEl.title = "Teacher";
    fabEl.setAttribute("aria-label", "Teacher unlock");
    fabEl.addEventListener("click", onFabClick);
    root.document.body.appendChild(fabEl);

    panelEl = root.document.createElement("div");
    panelEl.id = "mrj-teacher-unlock-panel";
    panelEl.className = "mrj-teacher-unlock-panel";
    panelEl.hidden = true;
    root.document.body.appendChild(panelEl);

    root.addEventListener("resize", scheduleLayout);
    root.addEventListener("orientationchange", scheduleLayout);
    var chip = root.document.getElementById("mrj-auth-student-chip");
    if (chip && typeof MutationObserver !== "undefined") {
      new MutationObserver(scheduleLayout).observe(chip, {
        attributes: true,
        childList: true,
        characterData: true,
      });
    }
    scheduleLayout();
    syncFab();
  }

  function boot() {
    mountFab();
    applyUnlockState(false);
  }

  root.MRJTeacherUnlock = {
    isMrjTeacher: isMrjTeacher,
    isUnlocked: isUnlocked,
    teacherCheck: teacherCheck,
    installRefresh: installRefresh,
    setJumpButtons: setJumpButtons,
    mount: mountFab,
    lock: function () {
      pinUnlocked = false;
      closePanel();
      applyUnlockState(false);
    },
  };

  if (root.document) {
    root.document.addEventListener("mrj-auth-ready", function () {
      setTimeout(boot, 60);
    });
    root.document.addEventListener("mrj-teacher", function () {
      if (isMrjTeacher()) syncFab();
    });
    if (root.document.readyState !== "loading") {
      setTimeout(function () {
        if (root.document.getElementById("mrj-auth-student-chip")) boot();
      }, 200);
    }
  }
})(typeof window !== "undefined" ? window : this);
