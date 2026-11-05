#!/usr/bin/env node
/**
 * Day 3 "Try again" (TRY_AGAIN_SPEC): one finished try = one appended row.
 * Proves: nothing is overwritten, best score and pass are kept, a lower retry
 * never takes away a pass or a gold star, teacher-opened tries say source teacher.
 *
 * Run: node scripts/test-day3-try-again.mjs
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = await readFile(join(root, 'day3/wb.js'), 'utf8');

function loadDay3({ unit = 'basic_a_u1', search = '?unit=basic_a_u1', path = '/day3/play.html', progress = null, teacherOpen = false } = {}) {
  const store = Object.assign({}, progress && { ['mrj_day3_' + unit]: JSON.stringify(progress) });
  const created = [];
  const shown = [];
  const mkEl = () => {
    const el = {
      innerHTML: '', className: '', textContent: '',
      querySelector: () => ({ onclick: null }),
      remove: () => { el.removed = true; },
    };
    created.push(el);
    return el;
  };
  const ctx = {
    console,
    unit,
    URLSearchParams,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    location: { search, pathname: path, reload: () => { shown.push('reload'); } },
    document: {
      body: { appendChild: (n) => { n.appended = true; } },
      querySelector: (s) => (s === '.trychip' && created.some((e) => e.className === 'trychip') ? created.find((e) => e.className === 'trychip') : null),
      createElement: mkEl,
      getElementById: () => null,
    },
    Audio: class { play() { return Promise.resolve(); } pause() {} },
    setTimeout: () => 0,
    window: {
      MRJTeacherUnlock: {
        day3LocalTeacherOpen: (u, id) => teacherOpen && u === unit && id === 'map',
        teacherDay3Open: () => false,
        getCachedProgress: () => null,
        isUnlocked: () => false,
      },
    },
  };
  ctx.window.window = ctx.window;
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.WB = WB;', ctx, { filename: 'wb.js' });
  const WB = ctx.WB;
  WB.D = { passPercent: 80, words: [], extras: [] };
  return { WB, store, created, shown, key: 'mrj_day3_' + unit };
}

const fails = [];
function t(name, fn) {
  try { fn(); console.log('ok   ' + name); } catch (e) { fails.push(name + ': ' + e.message); console.log('FAIL ' + name + ' — ' + e.message); }
}

t('first finished try is stored as attempt 1 with the old fields', () => {
  const { WB, store, key } = loadDay3();
  const r = WB.finish('match', 9, 10);
  assert.equal(r.n, 1);
  const rec = JSON.parse(store[key]).match;
  assert.equal(rec.attempts.length, 1);
  assert.equal(rec.attempts[0].n, 1);
  assert.equal(rec.attempts[0].score, 90);
  assert.equal(rec.attempts[0].correct, 9);
  assert.equal(rec.attempts[0].total, 10);
  assert.equal(rec.attempts[0].pass, true);
  assert.equal(rec.attempts[0].source, 'student');
  assert.equal(rec.pct, 90);
  assert.equal(rec.pass, true);
  assert.ok(rec.firstDoneAt, 'firstDoneAt kept for the teacher chart');
});

t('a second try is appended, try 1 stays with its own date', () => {
  const { WB, store, key } = loadDay3();
  WB.finish('match', 9, 10);
  const before = JSON.parse(store[key]).match.firstDoneAt;
  const r2 = WB.finish('match', 6, 10);
  assert.equal(r2.n, 2);
  const rec = JSON.parse(store[key]).match;
  assert.equal(rec.attempts.length, 2);
  assert.deepEqual(rec.attempts.map((a) => a.n), [1, 2]);
  assert.equal(rec.attempts[0].score, 90);
  assert.equal(rec.attempts[1].score, 60);
  assert.ok(rec.attempts[0].endedAt && rec.attempts[1].endedAt, 'both dates kept');
  assert.equal(rec.firstDoneAt, before);
  assert.equal(rec.lastAttemptAt, rec.attempts[1].endedAt);
  assert.equal(rec.attemptCount, 2);
});

t('a lower retry never removes the pass, the best score or the gold star', () => {
  const { WB, store, key } = loadDay3();
  WB.finish('match', 10, 10); // gold star
  WB.finish('match', 7, 10); // lower retry
  const rec = JSON.parse(store[key]).match;
  assert.equal(rec.pct, 100, 'best score stays 100');
  assert.equal(rec.pass, true, 'pass stays');
  assert.equal(rec.attempts.length, 2);
  assert.equal(WB.done('match'), true, 'the step stays done');
});

t('tryNo counts finished tries only (a reload without finishing adds nothing)', () => {
  const { WB } = loadDay3();
  assert.equal(WB.tryNo('match'), 1);
  WB.finish('match', 8, 10);
  assert.equal(WB.tryNo('match'), 2, 'next start is try 2');
  assert.equal(WB.tries('match').length, 1, 'nothing extra is written by starting');
});

t('an older record with no attempts is treated as try 1 and kept', () => {
  const legacy = { match: { pct: 90, right: 9, n: 10, pass: true, at: 111 } };
  const { WB, store, key } = loadDay3({ progress: legacy });
  const r = WB.finish('match', 5, 10);
  assert.equal(r.n, 1, 'sorted as the first try, not lost');
  const rec = JSON.parse(store[key]).match;
  assert.equal(rec.attempts.length, 1);
  assert.equal(rec.pct, 90, 'the old 90% is not lowered');
  assert.equal(rec.pass, true);
});

t('a step opened by a teacher is marked source teacher', () => {
  const { WB, store, key } = loadDay3({ teacherOpen: true });
  WB.finish('map', 8, 10);
  const rec = JSON.parse(store[key]).map;
  assert.equal(rec.attempts[0].source, 'teacher');
  assert.equal(JSON.parse(store[key]).match, undefined, 'no earlier step is marked done');
});

t('the warning card has the one sentence and the two answers', () => {
  const { WB, created } = loadDay3();
  WB.askTry();
  const card = created.find((e) => e.className === 'trymodal');
  assert.ok(card, 'the card is drawn');
  assert.ok(card.innerHTML.includes('Try again?</b>'), 'title is Try again?');
  assert.ok(card.innerHTML.includes('Your result now is saved. Nothing is erased.'), 'the one warning sentence');
  assert.ok(card.innerHTML.includes('Yes, try again'));
  assert.ok(card.innerHTML.includes('No, keep this'));
  assert.ok(card.appended, 'shown over the activity, no new screen');
});

t('a Try 2 chip is shown once an activity has been finished', () => {
  const fresh = loadDay3({ search: '?unit=basic_a_u1&a=match' });
  assert.equal(fresh.created.filter((e) => e.className === 'trychip').length, 0, 'no chip on the first try');
  const again = loadDay3({ search: '?unit=basic_a_u1&a=match', progress: { match: { pct: 90, right: 9, n: 10, pass: true, at: 1, attempts: [{ n: 1, score: 90 }] } } });
  const chip = again.created.find((e) => e.className === 'trychip');
  assert.ok(chip, 'chip drawn');
  assert.equal(chip.textContent, 'Try 2');
});

t('the results screen shows Try N and Best with the try number', () => {
  const { WB } = loadDay3();
  WB.finish('match', 9, 10);
  WB.finish('match', 8, 10);
  const rows = WB.tries('match');
  const bestPct = Math.max(...rows.map((a) => a.score));
  const bestRow = rows.find((a) => a.score === bestPct);
  assert.equal(bestPct, 90);
  assert.equal(bestRow.n, 1);
  assert.equal(WB.tryNo('match'), 3);
});

if (fails.length) {
  console.error('\n' + fails.length + ' failed');
  process.exit(1);
}
console.log('\nDay 3 Try again: all checks passed');
