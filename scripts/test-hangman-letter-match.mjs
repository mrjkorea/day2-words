#!/usr/bin/env node
/** Mirrors day3/acts.js Hangman letter logic (Hch, Hletter + got set). */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const Hch = (c) => String(c).toLowerCase();
const Hletter = (c) => /[a-z]/i.test(String(c));

function guessHit(wordEn, ch) {
  return [...wordEn].some((c) => Hch(c) === Hch(ch));
}

function reveal(wordEn, got) {
  return [...wordEn]
    .map((ch) => (Hletter(ch) ? (got.has(Hch(ch)) ? ch : '_') : ch))
    .join('');
}

function isWin(wordEn, got) {
  return [...wordEn].every((c) => !Hletter(c) || got.has(Hch(c)));
}

function allLettersGuessed(wordEn) {
  const got = new Set();
  for (const c of wordEn) {
    if (Hletter(c)) got.add(Hch(c));
  }
  return got;
}

// Title-cased place names (Basic C U5)
assert.equal(guessHit('Seoul', 's'), true);
assert.equal(guessHit('Tongyeong', 't'), true);
assert.equal(guessHit('Canada', 'c'), true);
let got = new Set(['s']);
assert.equal(reveal('Seoul', got), 'S____');
assert.equal(isWin('Seoul', new Set(['s', 'e', 'o', 'u', 'l'])), true);

// Lowercase vocabulary words unchanged
assert.equal(guessHit('pig', 'p'), true);
got = new Set(['p', 'i']);
assert.equal(reveal('pig', got), 'pi_');
assert.equal(guessHit('school', 's'), true);

// Hyphens and apostrophes auto-reveal; winnable with a–z only
assert.equal(reveal("o'clock", new Set()), "_'_____");
assert.equal(reveal('merry-go-round', new Set(['m'])), 'm____-__-_____');
assert.equal(isWin("o'clock", allLettersGuessed("o'clock")), true);
assert.equal(isWin('merry-go-round', allLettersGuessed('merry-go-round')), true);
assert.equal(isWin('ninety-nine', allLettersGuessed('ninety-nine')), true);

// Multi-word answers (spaces are non-letters)
assert.equal(reveal('English teacher', new Set(['e'])), 'E______ _e___e_');
assert.equal(isWin('English teacher', allLettersGuessed('English teacher')), true);

const dataDir = join(import.meta.dirname, '../day3/data');
const files = (await readdir(dataDir)).filter((f) => f.endsWith('.json'));
let hangmanWordCount = 0;
for (const file of files) {
  const unit = JSON.parse(await readFile(join(dataDir, file), 'utf8'));
  const words = unit.words || [];
  const byId = new Map(words.map((w) => [w.id, w.en]));
  const ids =
    unit.hangman && unit.hangman.words
      ? unit.hangman.words
      : words.map((w) => w.id);
  for (const id of ids) {
    const en = byId.get(id);
    if (!en) continue;
    hangmanWordCount++;
    const gotLetters = allLettersGuessed(en);
    assert.ok(isWin(en, gotLetters), `${file}: "${en}" not winnable with a–z guesses`);
    const punct = [...en].filter((c) => !Hletter(c));
    if (punct.length) {
      const shown = reveal(en, new Set());
      for (const c of punct) {
        assert.ok(
          shown.includes(c),
          `${file}: "${en}" should show punctuation "${c}" before any guess`,
        );
      }
    }
  }
}

console.log(`hangman letter match: ok (${hangmanWordCount} words across ${files.length} units)`);
