#!/usr/bin/env node
/**
 * Validates Day 3 unit JSON: word search placement + overlap find, crossword, climb, etc.
 */
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'day3/data');

// Load SearchLib (browser IIFE)
const require = createRequire(import.meta.url);
const vm = await import('node:vm');
const searchLibSrc = await readFile(join(root, 'day3/search-lib.js'), 'utf8');
const ctx = { SearchLib: null };
vm.runInNewContext(searchLibSrc + '\n;this.SearchLib = SearchLib;', ctx);
const SearchLib = ctx.SearchLib;

const Hch = (c) => String(c).toLowerCase();
const Hletter = (c) => /[a-z]/i.test(String(c));
const U = SearchLib.U;

function wLookup(unit, id) {
  const all = [...(unit.words || []), ...(unit.extras || [])];
  return all.find((w) => w.id === id);
}

function validateWordSearch(unit, file) {
  if (!unit.wordSearch) return [];
  const issues = [];
  const cfg = unit.wordSearch;
  const N = cfg.size || 8;
  const ids = cfg.words || (unit.words || []).map((w) => w.id);
  const letters = [];
  for (const id of ids) {
    const w = wLookup(unit, id);
    if (!w) {
      issues.push({ activity: 'search', issue: `missing word id ${id}`, fixed: 'no' });
      continue;
    }
    const s = U(w.en);
    if (s.length > N) {
      issues.push({ activity: 'search', issue: `word "${w.en}" longer than grid ${N}`, fixed: 'no' });
      continue;
    }
    if (!s.length) issues.push({ activity: 'search', issue: `empty word id ${id}`, fixed: 'no' });
    else letters.push(s);
  }
  if (!letters.length) return issues;
  const sorted = [...letters].sort((a, b) => b.length - a.length);
  const built = SearchLib.build(sorted, N, () => 0.42);
  if (!built.ok) {
    issues.push({ activity: 'search', issue: 'cannot place all words on grid (build failed)', fixed: 'no' });
    return issues;
  }
  if (!SearchLib.overlapFindable(built.placed)) {
    issues.push({ activity: 'search', issue: 'overlap find simulation failed', fixed: 'no' });
  }
  // Stochastic: many seeds must succeed
  let fail = 0;
  for (let seed = 0; seed < 30; seed++) {
    const rng = mulberry32(seed);
    const b = SearchLib.build(sorted, N, rng);
    if (!b.ok || !SearchLib.overlapFindable(b.placed)) fail++;
  }
  if (fail > 0) {
    issues.push({ activity: 'search', issue: `${fail}/30 random grids failed placement or overlap`, fixed: 'no' });
  }
  return issues;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mirror acts.js crossword placement
function buildCrossword(unit) {
  const ids = (unit.crossword && unit.crossword.words) || (unit.words || []).map((w) => w.id);
  const W = ids.map((id) => wLookup(unit, id)).filter(Boolean).sort((a, b) => U(b.en).length - U(a.en).length);
  const G = new Map();
  const key = (r, c) => r + ',' + c;
  const get = (r, c) => G.get(key(r, c));
  const P = [];
  function can(s, r, c, d) {
    const [dr, dc] = d;
    if (get(r - dr, c - dc) || get(r + dr * s.length, c + dc * s.length)) return false;
    let cross = 0;
    for (let j = 0; j < s.length; j++) {
      const rr = r + dr * j;
      const cc = c + dc * j;
      const v = get(rr, cc);
      if (v) {
        if (v !== s[j]) return false;
        cross++;
      } else if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return false;
    }
    return cross > 0;
  }
  function put(w, s, r, c, d) {
    for (let j = 0; j < s.length; j++) G.set(key(r + d[0] * j, c + d[1] * j), s[j]);
    P.push({ w, s, r, c, d });
  }
  W.forEach((w, k) => {
    const s = U(w.en);
    if (!k) {
      put(w, s, 0, 0, [0, 1]);
      return;
    }
    let best = null;
    for (const p of P) {
      const d = p.d[0] ? [0, 1] : [1, 0];
      for (let a = 0; a < p.s.length && !best; a++) {
        for (let b = 0; b < s.length && !best; b++) {
          if (p.s[a] === s[b]) {
            const r = p.r + p.d[0] * a - d[0] * b;
            const c = p.c + p.d[1] * a - d[1] * b;
            if (can(s, r, c, d)) best = [r, c, d];
          }
        }
      }
      if (best) break;
    }
    if (best) put(w, s, ...best);
  });
  return { W, P };
}

function validateCrossword(unit, file) {
  if (!unit.crossword) return [];
  const issues = [];
  const { W, P } = buildCrossword(unit);
  if (W.length && P.length === 0) {
    issues.push({
      activity: 'cross',
      issue: 'no crossword words could be placed',
      fixed: 'no',
    });
  }
  return issues;
}

function validateOdd(unit) {
  const issues = [];
  for (const s of unit.oddOneOut || []) {
    const items = s.items || [];
    if (!items.length) issues.push({ activity: 'odd', issue: 'empty items set', fixed: 'no' });
    if (!items.includes(s.odd)) issues.push({ activity: 'odd', issue: `odd id "${s.odd}" not in items`, fixed: 'no' });
    if (items.length && items.every((id) => id === s.odd)) {
      issues.push({ activity: 'odd', issue: 'all items are the odd one', fixed: 'no' });
    }
    for (const id of items) {
      if (!wLookup(unit, id)) issues.push({ activity: 'odd', issue: `missing word ${id}`, fixed: 'no' });
    }
  }
  return issues;
}

function validateDialogue(unit) {
  const issues = [];
  for (const d of unit.dialogues || []) {
    const n = (d.choices || []).length;
    if (n < 1) issues.push({ activity: 'dialogue', issue: 'no choices', fixed: 'no' });
    if (d.answer < 0 || d.answer >= n) {
      issues.push({ activity: 'dialogue', issue: `answer index ${d.answer} out of range`, fixed: 'no' });
    }
  }
  return issues;
}

function validateExpressions(unit) {
  const issues = [];
  for (const e of unit.expressions || []) {
    if (!e.text || !e.text.trim()) issues.push({ activity: 'unscramble', issue: 'empty expression', fixed: 'no' });
    if (e.text && !e.text.split(' ').filter(Boolean).length) {
      issues.push({ activity: 'unscramble', issue: 'expression has no words', fixed: 'no' });
    }
  }
  return issues;
}

function validateMatch(unit) {
  const issues = [];
  const W = unit.words || [];
  if (!W.length) return issues;
  for (const w of W) {
    if (!w.pic && !w.ko) issues.push({ activity: 'match', issue: `word ${w.id} has no pic or ko`, fixed: 'no' });
  }
  return issues;
}

function validateMap(unit) {
  const issues = [];
  const M = unit.map || {};
  if (M.hotspots) {
    for (const h of M.hotspots) {
      if (!wLookup(unit, h.id)) issues.push({ activity: 'map', issue: `hotspot missing word ${h.id}`, fixed: 'no' });
    }
  }
  return issues;
}

const CLIMB_TYPES = new Set(['listen', 'spell', 'fill', 'order', 'hear', 'dialogue']);

function validateClimb(unit) {
  const issues = [];
  for (const q of unit.questions || []) {
    if (!CLIMB_TYPES.has(q.type)) {
      issues.push({ activity: 'climb', issue: `unknown type ${q.type}`, fixed: 'no' });
      continue;
    }
    if (q.type === 'order') {
      if (!Array.isArray(q.answer) || !q.answer.length) {
        issues.push({ activity: 'climb', issue: 'order missing answer', fixed: 'no' });
      }
    } else if (q.answer === undefined || q.answer === null || q.answer === '') {
      issues.push({ activity: 'climb', issue: `${q.type} missing answer`, fixed: 'no' });
    }
    if (q.choices && q.choices.length) {
      const ans = Array.isArray(q.answer) ? q.answer.join(' ') : q.answer;
      if (!q.choices.includes(ans)) {
        issues.push({ activity: 'climb', issue: `answer not in choices: ${ans}`, fixed: 'no' });
      }
    }
    if (q.type === 'dialogue' && q.q && !q.q.text) {
      issues.push({ activity: 'climb', issue: 'dialogue missing question text', fixed: 'no' });
    }
  }
  return issues;
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function validateMedia(unit, file) {
  const issues = [];
  const base = join(root, 'day3');
  const check = async (rel, label) => {
    if (!rel || rel.includes('{v}')) return;
    const p = rel.startsWith('../') ? join(root, rel.replace(/^\.\.\//, '')) : join(base, rel);
    if (!(await pathExists(p))) {
      issues.push({ activity: label, issue: `missing file ${rel}`, fixed: 'no' });
    }
  };
  for (const w of unit.words || []) {
    if (w.pic) await check(w.pic, 'match');
  }
  if (unit.map && unit.map.scene) await check(unit.map.scene, 'map');
  return issues;
}

const files = (await readdir(dataDir))
  .filter((f) => f.endsWith('.json') && !f.endsWith('.map.json') && f !== 'units.json')
  .sort();
const allIssues = [];

for (const file of files) {
  const unit = JSON.parse(await readFile(join(dataDir, file), 'utf8'));
  const unitId = unit.id || file.replace('.json', '');
  const batches = [
    validateWordSearch(unit, file),
    validateCrossword(unit, file),
    validateOdd(unit),
    validateDialogue(unit),
    validateExpressions(unit),
    validateMatch(unit),
    validateMap(unit),
    validateClimb(unit),
    await validateMedia(unit, file),
  ];
  for (const issues of batches) {
    for (const iss of issues) {
      allIssues.push({ unit: unitId, file, ...iss });
    }
  }
}

// Regression: int3c_u5 pencil (across) + puzzle (down) share P — both must be findable after either order.
const overlapLetters = ['PENCIL', 'PUZZLE', 'PILLOW', 'HAT', 'BOOK', 'PHONE'].sort((a, b) => b.length - a.length);
const overlapBuilt = SearchLib.build(overlapLetters, 8, () => 0.5);
assert.ok(overlapBuilt.ok, 'int3c_u5-style word set must place on 8x8');
assert.ok(SearchLib.overlapFindable(overlapBuilt.placed), 'shared-cell words must remain findable');

if (allIssues.length) {
  console.error('Day 3 validation failed:\n');
  for (const i of allIssues) {
    console.error(`  [${i.unit}] ${i.activity}: ${i.issue}`);
  }
  process.exit(1);
}

console.log(`validate-day3: ok (${files.length} unit files)`);
