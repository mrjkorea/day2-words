#!/usr/bin/env node
"use strict";

const { bootApp } = require("./load_app_for_test.js");

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

const api = bootApp();
const internalId = "set_internal_uid_xyz";
const packId = "int2b_u3";

api.activateSet({
  id: internalId,
  packId: packId,
  title: "Int 2B · Unit 3",
  words: [{ id: "artist", en: "artist", ko: "예술가" }],
  intro: { artist: true },
  winsA: { artist: 2 },
  winsB: { artist: 2 },
  winsC: { artist: 2 },
  meetLock: ["artist"],
});

const shoot = api.shooterPack(api.currentSet());
if (!shoot || shoot.pack_id !== packId) {
  fail("shooterPack pack_id " + JSON.stringify(shoot && shoot.pack_id));
}
if (api.packIdForSet(api.currentSet()) !== packId) {
  fail("packIdForSet mismatch");
}

console.log("GAME_PACK_ID_OK");
