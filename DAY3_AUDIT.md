# Day 3 activity audit (2026-10-27)

Automated gate: `node scripts/validate-day3.mjs` and `node scripts/test-hangman-letter-match.mjs`.

| Activity | Issue | Units affected | Fixed |
|----------|-------|----------------|-------|
| **search** | Found words replaced each cell’s `onclick` with audio-only, so a letter shared by two words (e.g. **pencil** / **puzzle** on INT 3C U5) could not be tapped as the start/end of the second word. | All units with Word Search (113 packs with `wordSearch` in JSON) | **Yes** — `mark()` only adds the `f` class; taps still run `tap()`. |
| **search** | Grid builder could stop after 200 attempts with some words unplaced; game still ran with fewer clues. | Theoretical on any unit | **Yes** — `SearchLib.build()` tries up to 500 layouts; UI shows an error if placement fails. |
| **cross** | Greedy placer sometimes drops words that do not intersect the growing grid; students only solve clues that were placed (activity still reaches `WB.end`). | Many units (typical 5–6 of 7 words placed) | **No** — not completion-blocking; retry/backtracking left for a follow-up. |
| **hangman** | (none new) Letter/punctuation win logic | — | — (existing `scripts/test-hangman-letter-match.mjs`) |
| **match** | `.map.json` sidecar files have no `words` array | `*_u*.map.json` only (not loaded by `play.html`) | N/A |
| **map** | Hotspot / word references | All checked packs | **No issues** in validator pass |
| **odd** | `odd` id must be in `items` | All packs with `oddOneOut` | **No issues** |
| **unscramble** | Empty `expressions` | All packs | **No issues** |
| **dialogue** | `answer` index vs `choices` length | All packs | **No issues** |
| **climb** | `answer` in `choices`, known `type` values | All packs with `questions` (incl. review/culture where present) | **No issues** |
| **media** | Static `pic` / `map.scene` paths (no `{v}`) | Spot-checked via validator | **No issues** on required paths |

## Polish (non-blocking, out of scope for this PR)

- Crossword engine: place 100% of configured words or surface a teacher-visible warning.
- Culture / catalog JSON (`culture_*`, `units.json`, `*.map.json`) are not Day 3 workbook units; not audited as student activities.

## Root cause (Word Search classroom bug)

Hypothesis (1) was correct: selection UI treated found cells as exclusive by overwriting click handlers. Overlap in the generated grid was valid; **puzzle** was playable in the grid but not in the UI after **pencil** was found.
