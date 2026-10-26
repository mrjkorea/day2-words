#!/usr/bin/env node
/** Mirrors day3/acts.js Hangman letter logic (Hch + got set). */
import assert from 'node:assert/strict';

const Hch = (c) => String(c).toLowerCase();

function guessHit(wordEn, ch) {
  return [...wordEn].some((c) => Hch(c) === Hch(ch));
}

function reveal(wordEn, got) {
  return [...wordEn]
    .map((ch) => (ch === ' ' ? ' ' : got.has(Hch(ch)) ? ch : '_'))
    .join('');
}

function isWin(wordEn, got) {
  return [...wordEn].every((c) => c === ' ' || got.has(Hch(c)));
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

console.log('hangman letter match: ok');
