"use strict";

require("../js/progress-merge.js");

const merge = global.MRJ_WM_merge;
if (!merge) {
  console.error("MRJ_WM_merge missing");
  process.exit(1);
}

const local = {
  v: 1,
  sets: {
    basic_a_u1: {
      winsA: { w1: 1, w2: 2 },
      winsB: {},
      winsC: {},
      intro: { w1: true },
      meetLock: ["w1", "w2"],
      testPassed: { w1: 70 },
      lastPlayedAt: 100,
    },
  },
};

const remote = {
  v: 1,
  sets: {
    basic_a_u1: {
      winsA: { w1: 2, w3: 1 },
      winsB: { w2: 2 },
      winsC: {},
      intro: { w3: true },
      meetLock: ["w2", "w3"],
      testPassed: { w1: 90, w2: 80 },
      lastPlayedAt: 200,
    },
  },
};

const out = merge(local, remote);
const pack = out.sets.basic_a_u1;
if (pack.winsA.w1 !== 2) {
  console.error("winsA merge failed", pack.winsA);
  process.exit(1);
}
if (pack.winsA.w3 !== 1) {
  console.error("winsA w3 missing", pack.winsA);
  process.exit(1);
}
if (!pack.intro.w1 || !pack.intro.w3) {
  console.error("intro union failed", pack.intro);
  process.exit(1);
}
if (pack.testPassed.w1 !== 90 || pack.testPassed.w2 !== 80) {
  console.error("testPassed max failed", pack.testPassed);
  process.exit(1);
}
if (pack.meetLock.indexOf("w1") === -1 || pack.meetLock.indexOf("w3") === -1) {
  console.error("meetLock union failed", pack.meetLock);
  process.exit(1);
}

const emptyRemote = {
  v: 1,
  sets: {
    basic_a_u1: { winsA: {}, testPassed: {}, lastPlayedAt: 999 },
  },
};
const richLocal = {
  v: 1,
  sets: {
    basic_a_u1: { winsA: { w1: 2 }, testPassed: { w1: 80 }, lastPlayedAt: 1 },
  },
};
const guarded = merge(richLocal, emptyRemote);
if (!guarded.sets.basic_a_u1 || guarded.sets.basic_a_u1.testPassed.w1 !== 80) {
  console.error("empty remote guard failed", guarded.sets.basic_a_u1);
  process.exit(1);
}

console.log("PROGRESS_MERGE_OK");
process.exit(0);
