#!/usr/bin/env node
/** Smoke test: MRJTeacherUnlock treats server teacher and PIN session separately. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = join(import.meta.dirname, "..");
const js = await readFile(join(root, "js/mrj-teacher-unlock.js"), "utf8");
assert.match(js, /study_teacher_check/);
assert.match(js, /isTeacher/);
assert.match(js, /pinUnlocked/);

const wb = await readFile(join(root, "day3/wb.js"), "utf8");
assert.match(wb, /WB\.teacher/);
assert.match(wb, /MRJTeacherUnlock/);

console.log("mrj-teacher-unlock: ok");
