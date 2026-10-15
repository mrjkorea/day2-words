# MRJ Day 2 Words (Word Master)

Day 2 word packs for Mr. Jay's conversation books. **This repo holds packs only (plus the
book/unit list, thin redirects and the Songs pages).** The packs open in the one Word Master app,
https://mrjkorea.github.io/word-master/?packsrc=…, the same way `word-master-toeic` does.
Do not add Word Master app code here; change `mrjkorea/word-master` instead.

- Live index: https://mrjkorea.github.io/day2-words/
- Deep link: `https://mrjkorea.github.io/word-master/?packsrc=https%3A%2F%2Fmrjkorea.github.io%2Fday2-words%2Fpacks%2Fint2b_u3.json`
- Old deep link `play.html?pack=<book>_u<unit>` (e.g. `play.html?pack=int2b_u3`) still works: it redirects there.
- 9 books × 8 units = 72 packs in `packs/` (`packs/index.json` lists them)
- Words come from each unit's Day 4 speaking items: single words + one expression (or one question + one answer).
- Pictures: reused Day 4 / Day 5 art (`packs/<id>/<wordid>.jpg`, ≤512px). Words with `"pic": false` show the Korean meaning in the picture game.
- Audio (Fish Audio, s2.1-pro-free): `us_m` Coach Ray, `us_f` Miss Harper, `grandma` Grandma June, `grandpa` Grandpa Walt, `robot` KITT. UK/Teenager voices hidden.
- Songs scores: `js/progress-config.js` (kept for `songs/` only; Day 2 word scores now save through Word Master) → Google Apps Script web app (`apps-script/Code.gs`) writing to the "Day2" tab of "MRJ Word Master Progress (web)". Empty URL = device-only saving.
- Songs (karaoke): `songs/index.html` → `songs/play.html?song=<id>`. Add a song by dropping `songs/audio/<id>.mp3`, `songs/data/<id>.json`, and one entry in `songs/data/catalog.json`.
