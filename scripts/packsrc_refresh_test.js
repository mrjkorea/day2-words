#!/usr/bin/env node
"use strict";

require("../js/progress-merge.js");

const merge = global.MRJ_WM_merge;
const mergePack = global.MRJ_WM_mergePack;
const packEmpty = global.MRJ_WM_packProgressEmpty;
const { bootApp } = require("./load_app_for_test.js");

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

if (!merge || !mergePack || !packEmpty) fail("merge helpers missing");

const local = {
  v: 1,
  sets: {
    basic_a_u1: {
      title: "Basic A Unit 1",
      winsA: { one: 2 },
      winsB: { one: 2 },
      winsC: { one: 2 },
      intro: { one: true },
      testPassed: { one: 85 },
      lastPlayedAt: 100,
    },
  },
};

const emptyServer = {
  v: 1,
  sets: {
    basic_a_u1: {
      title: "Basic A Unit 1",
      winsA: {},
      winsB: {},
      winsC: {},
      intro: {},
      testPassed: {},
      lastPlayedAt: 200,
    },
  },
};

if (!packEmpty(emptyServer.sets.basic_a_u1)) fail("empty server pack should be empty");
if (packEmpty(local.sets.basic_a_u1)) fail("local pack should have progress");

const merged = merge(local, emptyServer);
const unit = merged.sets.basic_a_u1;
if (!unit || unit.testPassed.one !== 85) {
  fail("empty server overwrote testPassed: " + JSON.stringify(unit && unit.testPassed));
}
if (!unit.winsA || unit.winsA.one !== 2) fail("wins lost");

const dupA = { winsA: { w1: 2 }, testPassed: { w1: 80 }, lastPlayedAt: 50 };
const dupB = { winsA: {}, testPassed: {}, lastPlayedAt: 99 };
const slimMerged = mergePack(dupA, dupB);
if (!slimMerged.testPassed || slimMerged.testPassed.w1 !== 80) {
  fail("duplicate slim merge failed");
}

const api = bootApp();
const words = [{ id: "one", en: "one", ko: "하나" }];
const packSrc = "https://mrjkorea.github.io/day2-words/packs/basic_a_u1.json";
const good = {
  id: "set_basic_a_u1_a",
  packId: "basic_a_u1",
  title: "Basic A Unit 1",
  words: words,
  winsA: { one: 2 },
  winsB: { one: 2 },
  winsC: { one: 2 },
  intro: { one: true },
  meetLock: ["one"],
  testPassed: { one: 85 },
  lastPlayedAt: 100,
  externalPackSrc: packSrc,
};
api.activateSet(good);

const emptyDup = {
  id: "set_basic_a_u1_b",
  packId: "basic_a_u1",
  title: "Basic A Unit 1",
  words: words,
  winsA: {},
  winsB: {},
  winsC: {},
  intro: {},
  testPassed: {},
  lastPlayedAt: 300,
};
api.activateSet(emptyDup);
api.dedupeSetsByPackId();
const after = api.findSetByPackId("basic_a_u1");
if (!after || !after.testPassed || after.testPassed.one !== 85) {
  fail("dedupe lost testPassed");
}
if (!after.externalPackSrc) fail("dedupe should keep externalPackSrc from sibling");

api.mergeRemoteProgress(emptyServer);
const afterRemote = api.findSetByPackId("basic_a_u1");
if (!afterRemote || !afterRemote.testPassed || afterRemote.testPassed.one !== 85) {
  fail("mergeRemoteProgress empty server wiped progress");
}

api.applyRemote(emptyServer);
const afterApply = api.findSetByPackId("basic_a_u1");
if (!afterApply || !afterApply.testPassed || afterApply.testPassed.one !== 85) {
  fail("applyRemote empty server wiped progress");
}

const slim = api.slimProgress();
if (!slim.sets.basic_a_u1 || slim.sets.basic_a_u1.testPassed.one !== 85) {
  fail("slimProgress after refresh scenario");
}

console.log("PACKSRC_REFRESH_OK");
process.exit(0);
