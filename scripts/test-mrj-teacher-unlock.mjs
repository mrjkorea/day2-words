#!/usr/bin/env node
/** Gate logic smoke test for teacher unlock (no browser). */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

const root = join(import.meta.dirname, "..");

const js = await readFile(join(root, "js/mrj-teacher-unlock.js"), "utf8");
assert.match(js, /MRJ_TEMP_UNLOCK_ALL/);
assert.match(js, /teacherUnlock/);
assert.match(js, /Start from here/);

const wb = await readFile(join(root, "day3/wb.js"), "utf8");
assert.match(wb, /teacherDay3Open/);
assert.doesNotMatch(wb, /WB\.teacher\(\).*MRJ_TEMP_UNLOCK_ALL/s);

const slice = await readFile(join(root, "js/start-slice.js"), "utf8");
assert.match(slice, /alignedStart/);

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(slice, sandbox);
const aligned = sandbox.window.MRJ_StartSlice.alignedStart;
assert.equal(aligned(1), 1);
assert.equal(aligned(6), 6);
assert.equal(aligned(7), 6);
assert.equal(aligned(11), 11);

console.log("mrj-teacher-unlock: ok");
