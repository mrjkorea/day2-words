// Word Search grid builder + find simulation (browser + Node via vm).
// Used by acts.js and scripts/validate-day3.mjs.
var SearchLib = (function () {
  const U = (s) => s.toUpperCase().replace(/[^A-Z]/g, '');
  const AB = 'ABCDEFGHIJKLMNOPRSTUVWY';

  function canPlace(g, s, r, c, d) {
    const N = g.length;
    for (let j = 0; j < s.length; j++) {
      const rr = r + d[0] * j;
      const cc = c + d[1] * j;
      if (rr < 0 || cc < 0 || rr >= N || cc >= N) return false;
      const v = g[rr][cc];
      if (v !== '' && v !== s[j]) return false;
    }
    return true;
  }

  function place(g, s, r, c, d) {
    for (let j = 0; j < s.length; j++) g[r + d[0] * j][c + d[1] * j] = s[j];
  }

  /** @param {string[]} wordLetters sorted longest-first recommended */
  function build(wordLetters, N, rng) {
    const rand = rng || Math.random;
    const dirs = [[0, 1], [1, 0]];
    for (let attempt = 0; attempt < 500; attempt++) {
      const g = Array.from({ length: N }, () => Array(N).fill(''));
      const placed = [];
      let ok = true;
      for (const s of wordLetters) {
        let put = false;
        const slots = [];
        for (const d of dirs) {
          const maxR = N - d[0] * (s.length - 1);
          const maxC = N - d[1] * (s.length - 1);
          for (let r = 0; r < maxR; r++) {
            for (let c = 0; c < maxC; c++) {
              if (canPlace(g, s, r, c, d)) slots.push([r, c, d]);
            }
          }
        }
        for (let k = 0; k < 400 && !put; k++) {
          if (!slots.length) break;
          const [r, c, d] = slots[Math.floor(rand() * slots.length)];
          if (canPlace(g, s, r, c, d)) {
            place(g, s, r, c, d);
            placed.push({ s, r, c, d });
            put = true;
          }
        }
        if (!put) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (!g[r][c]) g[r][c] = AB[Math.floor(rand() * AB.length)];
          }
        }
        return { g, placed, ok: true };
      }
    }
    return { g: null, placed: [], ok: false };
  }

  function matchEndpoints(placed, found, r0, c0, r1, c1) {
    return placed.find(
      (p) =>
        !found.has(p.s) &&
        ((p.r === r0 && p.c === c0 && p.r + p.d[0] * (p.s.length - 1) === r1 && p.c + p.d[1] * (p.s.length - 1) === c1) ||
          (p.r === r1 && p.c === c1 && p.r + p.d[0] * (p.s.length - 1) === r0 && p.c + p.d[1] * (p.s.length - 1) === c0)),
    );
  }

  /** Simulate first/last tap find-all; order tests overlap (shared cells stay selectable). */
  function simulateFindAll(placed, order) {
    const found = new Set();
    for (const p of order) {
      const r0 = p.r;
      const c0 = p.c;
      const r1 = p.r + p.d[0] * (p.s.length - 1);
      const c1 = p.c + p.d[1] * (p.s.length - 1);
      const hit = matchEndpoints(placed, found, r0, c0, r1, c1);
      if (!hit || hit.s !== p.s) return false;
      found.add(p.s);
    }
    return found.size === placed.length;
  }

  function overlapFindable(placed) {
    if (!placed.length) return true;
    // Worst case for overlap: find longer horizontal words before vertical ones sharing a cell.
    const order = [...placed].sort((a, b) => b.s.length - a.s.length);
    if (!simulateFindAll(placed, order)) return false;
    if (placed.length > 1) {
      const rev = [...placed].reverse();
      if (!simulateFindAll(placed, rev)) return false;
    }
    return true;
  }

  return { U, build, simulateFindAll, overlapFindable, matchEndpoints };
})();
