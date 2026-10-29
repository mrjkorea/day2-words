#!/usr/bin/env node
/** Smoke test: MRJTeacherUnlock uses mrj-auth teacher only (no duplicate FAB/PIN). */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const js = await readFile(join(root, "js/mrj-teacher-unlock.js"), "utf8");
assert.match(js, /isTeacher/);
assert.doesNotMatch(js, /mrj-teacher-unlock-btn/);
assert.doesNotMatch(js, /study_teacher_check/);
assert.doesNotMatch(js, /pinUnlocked/);

const wb = await readFile(join(root, "day3/wb.js"), "utf8");
assert.match(wb, /WB\.teacher/);
assert.match(wb, /MRJTeacherUnlock/);

console.log("mrj-teacher-unlock: ok");
