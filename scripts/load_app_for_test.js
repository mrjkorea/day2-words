"use strict";

function makeEl(id) {
  const children = [];
  const attrs = {};
  const node = {
    id: id || "",
    hidden: false,
    textContent: "",
    className: "",
    value: "",
    title: "",
    style: {},
    children: children,
    classList: {
      add: function () {},
      remove: function () {},
      toggle: function () {},
      contains: function () { return false; },
    },
    addEventListener: function () {},
    removeEventListener: function () {},
    setAttribute: function (name, value) { attrs[name] = String(value); },
    getAttribute: function (name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    appendChild: function (child) { children.push(child); return child; },
    querySelector: function () { return makeEl(); },
    querySelectorAll: function () { return []; },
    getContext: function () { return null; },
    getBoundingClientRect: function () { return { width: 0, height: 0 }; },
    parentElement: null,
    play: function () { return { catch: function () {} }; },
    pause: function () {},
    src: "",
  };
  let html = "";
  Object.defineProperty(node, "innerHTML", {
    get: function () { return html; },
    set: function (v) { html = String(v); children.length = 0; },
  });
  return node;
}

function bootApp() {
  const cache = {};
  function el(id) {
    if (id && cache[id]) return cache[id];
    const node = makeEl(id);
    if (id) cache[id] = node;
    return node;
  }
  const g = global;
  g.window = g;
  g.addEventListener = function () {};
  g.localStorage = {
    getItem: function () { return null; },
    setItem: function () {},
  };
  g.sessionStorage = {
    getItem: function () { return null; },
    setItem: function () {},
  };
  g.location = {
    search: "",
    href: "http://localhost/day2-words/play.html",
    origin: "http://localhost",
    assign: function () {},
  };
  g.document = {
    querySelector: function (sel) {
      const m = /^#([\w-]+)$/.exec(String(sel || ""));
      if (m) return el(m[1]);
      return el("q:" + sel);
    },
    querySelectorAll: function () { return []; },
    createElement: function () { return makeEl(); },
    addEventListener: function () {},
    body: el("body"),
    activeElement: null,
  };
  g.Audio = function () {
    return { play: function () { return { catch: function () {} }; }, pause: function () {}, src: "" };
  };
  g.fetch = function () { return Promise.reject(new Error("offline")); };
  g.matchMedia = function () {
    return { matches: false, addEventListener: function () {}, addListener: function () {} };
  };
  g.requestAnimationFrame = function () { return 0; };
  g.WordFactoryAlgo = require("../js/factory-algo.js");
  g.MeetLock = require("../js/meet-lock.js");
  g.SpellStop = require("../js/spell-stop.js");
  g.WordFactoryI18n = { t: function (k) { return k; }, setLocale: function (l) { return l; }, getLocale: function () { return "en"; }, applyDom: function () {}, fillSelect: function () {} };
  g.WM_TEST_HOOK = true;
  require("../js/progress-merge.js");
  require("../js/app.js");
  return g.WM_TEST;
}

module.exports = { bootApp: bootApp };
