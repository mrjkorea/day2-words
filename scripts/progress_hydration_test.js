"use strict";

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

function canSave(state) {
  return !!(state.hydrated && state.loadDone && state.id && state.token);
}

assert(!canSave({ hydrated: false, loadDone: true, id: "a", token: "t" }), "no save before hydrated");
assert(!canSave({ hydrated: true, loadDone: false, id: "a", token: "t" }), "no save before loadDone");
assert(canSave({ hydrated: true, loadDone: true, id: "a", token: "t" }), "save when hydrated and loaded");

function loadResponseOk(res) {
  if (!res || typeof res !== "object") return false;
  if (res.ok === false) return false;
  if (res.error) return false;
  return true;
}

assert(!loadResponseOk({ ok: false, error: "auth" }), "1.4.0 explicit failure");
assert(!loadResponseOk({ ok: true, error: "weird" }), "error blocks hydration");
assert(loadResponseOk({ ok: true, found: false }), "empty found still ok load");

console.log("PROGRESS_HYDRATION_OK");
process.exit(0);
