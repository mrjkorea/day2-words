#!/usr/bin/env node
/**
 * Day 3 → ClassroomMetrics: one row per finished try, canonical item id unit|step.
 * Proves the audit fix (Jay's study-world audit, via Reg/Metrics 2026-11-11):
 *   - a finished activity posts exactly one row, and a retry posts its own row
 *   - the item id never carries a try suffix; attempt / re_attempt are in metadata
 *   - the Mountain Quiz and a review climb post under the same scheme
 *   - an unsigned student posts nothing, and a mid-play 80% tick posts nothing
 *
 * Run: node scripts/test-day3-metrics.mjs
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = await readFile(join(root, 'day3/wb.js'), 'utf8');

function loadDay3({ unit = 'basic_a_u1', student = 'student@example.com', scores = true } = {}) {
  const store = {};
  const posts = [];
  const ctx = {
    console,
    URLSearchParams,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    location: { search: '?unit=' + unit, pathname: '/day3/play.html', reload: () => {} },
    document: {
      body: { appendChild: () => {} },
      querySelector: () => null,
      createElement: () => ({ innerHTML: '', className: '', remove: () => {} }),
      getElementById: () => null,
    },
    Audio: class { play() { return Promise.resolve(); } pause() {} },
    setTimeout: () => 0,
    window: {},
  };
  ctx.window.window = ctx.window;
  ctx.window.MRJ_AUTH = { student: () => student };
  if (scores) {
    ctx.window.MRJ_SCORES = {
      post: (o) => { posts.push(o); return Promise.resolve({ status: 'sent' }); },
    };
  }
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.WB = WB;', ctx, { filename: 'wb.js' });
  const WB = ctx.WB;
  WB.D = { passPercent: 80, title: 'Basic A U1', book: 'Basic A', words: [], extras: [] };
  return { WB, posts };
}

const fails = [];
function t(name, fn) {
  try { fn(); console.log('ok   ' + name); } catch (e) { fails.push(name + ': ' + e.message); console.log('FAIL ' + name + ' — ' + e.message); }
}

t('a finished activity posts one row with program day3-workbook', () => {
  const { WB, posts } = loadDay3();
  WB.finish('match', 9, 10);
  assert.equal(posts.length, 1);
  const p = posts[0];
  assert.equal(p.program, 'day3-workbook');
  assert.equal(p.itemId, 'basic_a_u1|match');
  assert.equal(p.itemType, 'activity');
  assert.equal(p.student, 'student@example.com');
  assert.equal(p.unitTitle, 'basic_a_u1');
  assert.equal(p.scoreValue, 9);
  assert.equal(p.scoreMax, 10);
  assert.equal(p.scorePct, 90);
  assert.equal(p.correctness, 'correct');
  assert.equal(p.attemptIndex, 1, 'the try number goes to its own column');
  assert.equal(p.completed, true, 'a finished try says completed');
  assert.equal(p.unitId, 'basic_a_u1');
  assert.equal(p.metadata.step, 'match');
  assert.equal(p.metadata.attempt, 1);
  assert.equal(p.metadata.re_attempt, false);
  assert.equal(p.metadata.passed, true);
});

t('the item id never carries a try suffix and a retry posts its own row', () => {
  const { WB, posts } = loadDay3();
  WB.finish('match', 9, 10);
  WB.finish('match', 6, 10);
  assert.equal(posts.length, 2, 'one row per finished try');
  assert.deepEqual(posts.map((p) => p.itemId), ['basic_a_u1|match', 'basic_a_u1|match']);
  assert.deepEqual(posts.map((p) => p.metadata.attempt), [1, 2]);
  assert.deepEqual(posts.map((p) => p.metadata.re_attempt), [false, true]);
  assert.deepEqual(posts.map((p) => p.attemptIndex), [1, 2], 'attempt_index follows the try');
  assert.equal(posts[1].scorePct, 60);
  assert.equal(posts[1].correctness, 'incorrect');
});

t('the Mountain Quiz posts under unit|climb', () => {
  const { WB, posts } = loadDay3({ unit: 'basic_a_u3' });
  WB.finish('climb', 10, 12);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].itemId, 'basic_a_u3|climb');
  assert.equal(posts[0].scoreValue, 10);
  assert.equal(posts[0].scoreMax, 12);
  assert.equal(posts[0].scorePct, 83);
});

t('a review climb posts under the review unit id', () => {
  const { WB, posts } = loadDay3({ unit: 'review_int2' });
  WB.D = { passPercent: 80, title: 'Review INT 2', book: 'INT 2', kind: 'review', words: [], extras: [] };
  WB.finish('climb', 8, 10);
  assert.equal(posts[0].itemId, 'review_int2|climb');
  assert.equal(posts[0].program, 'day3-workbook');
});

t('an unsigned student posts nothing (local progress still saves)', () => {
  const { WB, posts } = loadDay3({ student: '' });
  WB.finish('match', 9, 10);
  assert.equal(posts.length, 0);
  assert.equal(WB.tries('match').length, 1);
});

t('a page with no score client does not throw', () => {
  const { WB, posts } = loadDay3({ scores: false });
  const r = WB.finish('match', 9, 10);
  assert.equal(r.n, 1);
  assert.equal(posts.length, 0);
});

t('the 80% mid-play tick never posts: only a finished try does', () => {
  const { WB, posts } = loadDay3();
  WB.tick('map', 8, 10);
  assert.equal(posts.length, 0, 'the Next level chip is not a finished try');
  assert.equal(WB.tries('map').length, 0, 'and it writes no attempt row');
});

if (fails.length) {
  console.log('\nFAIL ' + fails.length + ' check(s)');
  process.exit(1);
}
console.log('\nDAY3_METRICS_OK ' + 7 + ' checks');
