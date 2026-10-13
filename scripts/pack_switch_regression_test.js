#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { bootApp } = require("./load_app_for_test.js");

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

function firstWordEn(api) {
  const set = api.currentSet();
  if (!set || !set.words || !set.words.length) return "";
  return set.words[0].en;
}

function loadPackWords(pid) {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "packs", pid + ".json"), "utf8")
  );
  return {
    title: raw.title,
    words: raw.words.map(function (w, i) {
      return {
        id: String(w.id || w.en || "w" + i),
        en: String(w.en || ""),
        ko: String(w.ko || (w.l1 && w.l1.ko) || ""),
      };
    }),
  };
}

const api = bootApp();
global.MRJ_AUTH = { student: function () { return "packtest"; } };

api.mergeRemoteProgress({
  v: 1,
  currentPackId: "basic_a_u1",
  sets: {
    basic_a_u1: {
      title: "Basic A · Unit 1",
      winsA: { one: 2 },
      intro: { one: true },
      meetLock: ["one"],
      lastPlayedAt: 5000,
    },
  },
});

if (!api.currentSet() || api.currentSet().packId !== "basic_a_u1") {
  fail("expected basic_a_u1 after remote merge");
}

const u2 = loadPackWords("basic_a_u2");
api.activateSet({
  id: "set_basic_a_u2",
  packId: "basic_a_u2",
  title: u2.title,
  words: u2.words,
  intro: {},
  winsA: {},
  winsB: {},
  winsC: {},
  meetLock: [],
});

if (firstWordEn(api) !== u2.words[0].en) {
  fail("basic_a_u2 first word wrong: " + firstWordEn(api));
}

api.mergeRemoteProgress({
  v: 1,
  currentPackId: "basic_a_u1",
  sets: {
    basic_a_u1: {
      title: "Basic A · Unit 1",
      winsA: { one: 2 },
      intro: { one: true },
      meetLock: ["one"],
      lastPlayedAt: 5000,
    },
  },
});

if (!api.currentSet() || api.currentSet().packId !== "basic_a_u2") {
  fail(
    "late server pull switched pack to " +
      (api.currentSet() && api.currentSet().packId) +
      " first=" +
      firstWordEn(api)
  );
}

const slim = api.slimProgress();
if (slim.currentPackId !== "basic_a_u2") {
  fail("slim currentPackId should stay basic_a_u2, got " + slim.currentPackId);
}

console.log("PACK_SWITCH_REGRESSION_OK");
