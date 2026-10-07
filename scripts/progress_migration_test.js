"use strict";

global.DAY2_WORDS_PACK_IDS = ["basic_a_u1", "int2b_u3", "word_master_only"];
const {
  mergeProgress,
  progressHasPackData,
  filterProgressToPackIds,
  buildMigratedDay2Progress,
} = require("../js/progress-merge.js");

const ids = global.DAY2_WORDS_PACK_IDS;

const legacy = {
  v: 1,
  sets: {
    basic_a_u1: { winsA: { w1: 2 }, lastPlayedAt: 50 },
    not_a_day2_pack: { winsA: { x: 9 }, lastPlayedAt: 99 },
    int2b_u3: { winsA: { w2: 1 }, lastPlayedAt: 40 },
  },
};

const filtered = filterProgressToPackIds(legacy, ids);
if (filtered.sets.not_a_day2_pack) {
  console.error("filter should drop non-day2 packs");
  process.exit(1);
}
if (!filtered.sets.basic_a_u1 || !filtered.sets.int2b_u3) {
  console.error("filter should keep day2 packs");
  process.exit(1);
}

const local = {
  v: 1,
  sets: {
    basic_a_u1: { winsA: { w1: 1 }, intro: { w1: true }, lastPlayedAt: 100 },
  },
};

const built = buildMigratedDay2Progress(null, legacy, local, ids, mergeProgress);
if (!built.migrated) {
  console.error("expected migration when server empty");
  process.exit(1);
}
const pack = built.progress.sets.basic_a_u1;
if (!pack || pack.winsA.w1 !== 2) {
  console.error("migration should max-merge legacy and local", pack);
  process.exit(1);
}
if (!progressHasPackData(built.progress)) {
  console.error("migrated progress should have pack data");
  process.exit(1);
}

const serverOnly = {
  v: 1,
  sets: { int2b_u3: { winsA: { w9: 3 }, lastPlayedAt: 10 } },
};
const noMigrate = buildMigratedDay2Progress(serverOnly, legacy, local, ids, mergeProgress);
if (noMigrate.migrated) {
  console.error("should not migrate when day2-words server already has data");
  process.exit(1);
}

console.log("PROGRESS_MIGRATION_OK");
process.exit(0);
