# MRJ Day 2 Words (Word Master)

Day 2 word packs for Mr. Jay's conversation books — same Word Master app and steps
(Meet · Learn · Dictation · Write · Games · Test), sibling of `mrjkorea/word-master`.

- Live index: https://mrjkorea.github.io/day2-words/
- Deep link: `play.html?pack=<book>_u<unit>` e.g. `play.html?pack=int2b_u3`
- 9 books × 8 units = 72 packs in `packs/` (`packs/index.json` lists them)
- Words come from each unit's Day 4 speaking items: single words + one expression (or one question + one answer).
- Pictures: reused Day 4 / Day 5 art (`packs/<id>/<wordid>.jpg`, ≤512px). Words with `"pic": false` show the Korean meaning in the picture game.
- Audio (Fish Audio, s2.1-pro-free): `us_m` Coach Ray, `us_f` Miss Harper, `grandma` Grandma June, `grandpa` Grandpa Walt, `robot` KITT. UK/Teenager voices hidden.
- Scores: `js/progress-config.js` → Google Apps Script web app (`apps-script/Code.gs`) writing to the "Day2" tab of "MRJ Word Master Progress (web)". Empty URL = device-only saving.
