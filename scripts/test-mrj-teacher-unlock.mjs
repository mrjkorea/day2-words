#!/usr/bin/env node
/** Teacher unlock: migration keeps the flag, saves are ordered, buttons do not duplicate. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

const root = join(import.meta.dirname, "..");

const js = await readFile(join(root, "js/mrj-teacher-unlock.js"), "utf8");
assert.match(js, /MRJ_TEMP_UNLOCK_ALL/);
assert.match(js, /teacherUnlock/);
assert.match(js, /Start from here/);
assert.match(js, /20261103-day2-teacher-save/);

const wb = await readFile(join(root, "day3/wb.js"), "utf8");
assert.match(wb, /teacherDay3Open/);
assert.doesNotMatch(wb, /WB\.teacher\(\).*MRJ_TEMP_UNLOCK_ALL/s);

const slice = await readFile(join(root, "js/start-slice.js"), "utf8");
assert.match(slice, /alignedStart/);

const unlockAll = await readFile(join(root, "js/mrj-unlock-all.js"), "utf8");
assert.match(unlockAll, /MRJ_TEMP_UNLOCK_ALL = true/);
const cfg = await readFile(join(root, "js/progress-config.js"), "utf8");
assert.match(cfg, /MRJ_TEMP_UNLOCK_ALL = true/);

const sliceBox = { window: {}, console };
vm.createContext(sliceBox);
vm.runInContext(slice, sliceBox);
const aligned = sliceBox.window.MRJ_StartSlice.alignedStart;
assert.equal(aligned(1), 1);
assert.equal(aligned(6), 6);
assert.equal(aligned(7), 6);
assert.equal(aligned(11), 11);

function drain() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 0);
  });
}

async function until(fn, tries) {
  for (var i = 0; i < (tries || 30); i++) {
    if (fn()) return;
    await drain();
  }
  assert.equal(fn(), true);
}

const mergeSrc = await readFile(join(root, "js/progress-merge.js"), "utf8");
const progressSrc = await readFile(join(root, "js/progress.js"), "utf8");

const mem = {};
const box = {
  console,
  setTimeout,
  clearTimeout,
  localStorage: {
    getItem: function (k) { return mem[k] == null ? null : mem[k]; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; },
  },
  MRJ_AUTH: null,
  DAY2_WORDS_PROGRAM: "day2-words",
  DAY2_WORDS_LEGACY_PROGRAM: "word-master",
};
box.window = box;
vm.createContext(box);
vm.runInContext(mergeSrc, box);
vm.runInContext(progressSrc, box);

const serverJson = JSON.stringify({
  v: 1,
  sets: {},
  teacherUnlock: { units: { basic_a_u3: true }, songs: {}, day3: {} },
});
const legacyJson = JSON.stringify({
  v: 1,
  sets: { basic_a_u1: { intro: { w: true }, lastPlayedAt: 5 } },
});

const built = box.MRJ_WM_buildMigratedDay2Progress(
  JSON.parse(serverJson),
  JSON.parse(legacyJson),
  null,
  ["basic_a_u1", "basic_a_u3"],
  box.MRJ_WM_merge
);
assert.equal(built.progress.teacherUnlock.units.basic_a_u3, true);
assert.equal(built.progress.sets.basic_a_u1.intro.w, true);
assert.equal(box.MRJ_WM_progressHasPackData(built.progress), true);

const saves = [];
box.MRJ_AUTH = {
  student: function () { return "zz_test_it_wm"; },
  token: function () { return "tok"; },
  loadPack: function (program) {
    var json = program === "word-master" ? legacyJson : serverJson;
    return Promise.resolve({ ok: true, found: true, progress_json: json });
  },
  savePack: function (_program, json) {
    return new Promise(function (resolve) {
      saves.push({
        json: json,
        release: function () { resolve({ ok: true, saved: true }); },
      });
    });
  },
};

const loadP = box.MRJ_WM_progress.load();
await until(function () { return saves.length === 1; });
var loadDone = false;
loadP.then(function () { loadDone = true; });
await drain();
assert.equal(loadDone, false, "load waits until the migration save finishes");
var mig = JSON.parse(saves[0].json);
assert.equal(mig.teacherUnlock.units.basic_a_u3, true);
assert.ok(mig.sets.basic_a_u1);

const later = JSON.parse(JSON.stringify(mig));
later.teacherUnlock.units.basic_a_u4 = true;
const saveP = box.MRJ_WM_progress.save({ progress_json: JSON.stringify(later) });
await drain();
await drain();
assert.equal(saves.length, 1, "newer save waits until the migration post finishes");
saves[0].release();
await until(function () { return saves.length === 2; });
assert.equal(JSON.parse(saves[1].json).teacherUnlock.units.basic_a_u4, true);
saves[1].release();
await saveP;
await loadP;
assert.equal(loadDone, true);

function makeDocument(store) {
  function matches(node, sel) {
    return sel.split(",").some(function (part) {
      part = part.trim();
      if (part.charAt(0) === ".") {
        return node.className.split(/\s+/).indexOf(part.slice(1)) >= 0;
      }
      if (part.charAt(0) === "#") return node.id === part.slice(1);
      return node.tagName === part.toUpperCase();
    });
  }
  function walk(node, sel, out) {
    (node.children || []).forEach(function (ch) {
      if (matches(ch, sel)) out.push(ch);
      walk(ch, sel, out);
    });
  }
  function el(tag) {
    var node = {
      tagName: String(tag || "div").toUpperCase(),
      className: "",
      id: "",
      type: "",
      hidden: false,
      children: [],
      parentNode: null,
      isConnected: true,
      _text: "",
      listeners: {},
      attributes: {},
      style: {},
    };
    node.classList = {
      add: function (c) {
        var parts = node.className.split(/\s+/).filter(Boolean);
        if (parts.indexOf(c) === -1) parts.push(c);
        node.className = parts.join(" ");
      },
      toggle: function (c, on) {
        if (on) node.classList.add(c);
      },
    };
    node.appendChild = function (ch) {
      ch.parentNode = node;
      node.children.push(ch);
      return ch;
    };
    node.removeChild = function (ch) {
      node.children = node.children.filter(function (c) { return c !== ch; });
      ch.parentNode = null;
    };
    node.setAttribute = function (k, v) { node.attributes[k] = String(v); };
    node.getAttribute = function (k) { return node.attributes[k]; };
    node.addEventListener = function (ev, fn) {
      node.listeners[ev] = node.listeners[ev] || [];
      node.listeners[ev].push(fn);
    };
    node.querySelectorAll = function (sel) {
      var out = [];
      walk(node, sel, out);
      return out;
    };
    node.querySelector = function (sel) {
      return node.querySelectorAll(sel)[0] || null;
    };
    Object.defineProperty(node, "textContent", {
      get: function () {
        if (node.children.length) return node.children.map(function (c) { return c.textContent; }).join("");
        return node._text;
      },
      set: function (v) {
        node._text = String(v);
        node.children = [];
      },
    });
    Object.defineProperty(node, "innerHTML", {
      get: function () { return ""; },
      set: function (html) {
        node.children = [];
        node._text = "";
        if (String(html).indexOf("mrj-teacher-panel-list") >= 0) {
          var list = el("div");
          list.className = "mrj-teacher-panel-list";
          var close = el("button");
          close.className = "mrj-teacher-panel-close";
          var student = el("b");
          student.id = "mrj-teacher-panel-student";
          node.appendChild(list);
          node.appendChild(close);
          node.appendChild(student);
        }
      },
    });
    return node;
  }
  var listeners = {};
  var body = el("body");
  var doc = {
    readyState: "loading",
    body: body,
    addEventListener: function (ev, fn) {
      listeners[ev] = listeners[ev] || [];
      listeners[ev].push(fn);
    },
    createElement: el,
    getElementById: function (id) {
      var all = [];
      walk(body, "#" + id, all);
      return all[0] || null;
    },
    querySelector: function (sel) { return body.querySelector(sel); },
    querySelectorAll: function (sel) { return body.querySelectorAll(sel); },
    dispatchEvent: function (ev) {
      (listeners[ev.type] || []).forEach(function (fn) { fn(ev); });
    },
  };
  body.ownerDocument = doc;
  return { doc: doc, el: el, store: store };
}

function bootTeacher(opts) {
  var saved = [];
  var server = opts.server;
  var store = opts.store || {};
  var dom = makeDocument(store);
  var sandbox = {
    console,
    setTimeout,
    clearTimeout,
    document: dom.doc,
    localStorage: {
      getItem: function (k) { return store[k] == null ? null : store[k]; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
    },
    MRJ_TEMP_UNLOCK_ALL: opts.tempUnlock !== false,
    MRJ_AUTH: {
      student: function () { return "zz_test_it_wm"; },
      isTeacher: function () { return true; },
    },
    MRJ_WM_progress: {
      load: function () {
        return Promise.resolve({ ok: true, progress_json: JSON.stringify(server) });
      },
      save: function (payload) {
        server = JSON.parse(payload.progress_json);
        saved.push(server);
        return Promise.resolve({ ok: true, saved: true });
      },
    },
    CustomEvent: function CustomEvent(type) { this.type = type; },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);
  return { sandbox: sandbox, dom: dom, saved: saved, store: store, getServer: function () { return server; } };
}

const ui = bootTeacher({
  tempUnlock: true,
  server: { v: 1, sets: { basic_a_u1: { intro: { a: true }, lastPlayedAt: 1 } }, teacherUnlock: { units: {}, songs: {}, day3: {} } },
});
var card = ui.dom.el("a");
card.className = "card unit";
card.isConnected = true;
ui.dom.doc.body.appendChild(card);
ui.sandbox.MRJTeacherUnlock.openPanel();
await drain();
await drain();
ui.sandbox.MRJTeacherUnlock.registerSections([
  { kind: "unit", id: "basic_a_u3", node: card, showRelock: true },
]);
await until(function () { return card.querySelectorAll(".mrj-teacher-start-btn").length === 2; });
assert.equal(card.querySelectorAll(".mrj-teacher-relock-btn").length, 1);

var startBtn = card.querySelectorAll(".mrj-teacher-start-btn").filter(function (b) {
  return b.className.indexOf("mrj-teacher-relock-btn") < 0;
})[0];
function click(node) {
  (node.listeners.click || []).forEach(function (fn) {
    fn({ stopPropagation: function () {}, preventDefault: function () {} });
  });
}
click(startBtn);
await until(function () { return ui.saved.length >= 1; });
click(startBtn);
await drain();
await drain();
await drain();
await drain();
assert.equal(card.querySelectorAll(".mrj-teacher-start-btn").length, 2, "repeated clicks must not stack buttons");
assert.equal(card.querySelectorAll(".mrj-teacher-relock-btn").length, 1);
assert.equal(ui.saved[0].teacherUnlock.units.basic_a_u3, true);
assert.equal(ui.saved[0].__mrjLoadFailed, undefined);
var panel = ui.dom.doc.body.querySelector("#mrj-teacher-control-panel") || ui.dom.doc.body.querySelector(".mrj-teacher-control-panel");
assert.ok(panel, "panel exists");
var list = panel.querySelector(".mrj-teacher-panel-list");
assert.match(list.textContent, /Basic A: start at unit03/);
assert.doesNotMatch(list.textContent, /No teacher unlocks saved yet/);
var undo = list.querySelector(".mrj-teacher-panel-undo");
assert.ok(undo);
assert.equal(undo.textContent, "Undo");
assert.equal(ui.store["mrj.day2words.teacherUnlock.zz_test_it_wm"] != null, true);

ui.sandbox.MRJ_TEMP_UNLOCK_ALL = false;
assert.equal(ui.sandbox.MRJTeacherUnlock.unitOpen("basic_a_u3"), true);
assert.equal(ui.sandbox.MRJTeacherUnlock.unitOpen("basic_a_u4"), false);
assert.equal(ui.sandbox.MRJTeacherUnlock.tempUnlockAll(), false);

const again = bootTeacher({
  tempUnlock: false,
  store: Object.assign({}, ui.store),
  server: { v: 1, sets: { basic_a_u1: { intro: { a: true }, lastPlayedAt: 1 } }, teacherUnlock: { units: {}, songs: {}, day3: {} } },
});
again.sandbox.MRJTeacherUnlock.openPanel();
await until(function () {
  var host = again.dom.doc.body.querySelector(".mrj-teacher-control-panel");
  var lines = host && host.querySelector(".mrj-teacher-panel-list");
  return !!(lines && /Basic A: start at unit03/.test(lines.textContent));
});
assert.equal(again.sandbox.MRJTeacherUnlock.unitOpen("basic_a_u3"), true);
assert.equal(again.sandbox.MRJTeacherUnlock.tempUnlockAll(), false);

console.log("mrj-teacher-unlock: ok");
