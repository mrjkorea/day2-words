# Day 3 virtual workbook: unit JSON format

One file per unit: `day3/data/<unit>.json`. Open with `day3/index.html?unit=<unit>`.
Adding a unit = adding one JSON file. The games (`play.html` + `acts.js`, `climb.html`) never change.
All paths are relative to the `day3/` folder. Add `&test=1` to unlock every step and show a skip button.

| Key | Used by | What it is |
|---|---|---|
| `id`, `title` | all | Unit id (same as the file name) and the title shown on screen. |
| `passPercent` | climb | Pass mark for the final mountain test (80). |
| `words[]` | 1,2,4,5,6 | Unit words: `{id, en, pic, audio, sentence}`. `pic` = picture, `audio` = word mp3, `sentence` = optional "It is a ___." mp3. |
| `extras[]` | 3 | Clearly different items (food, animals) for Odd One Out, same shape as words. |
| `map` | 2 | `{scene: null}` shows a grid of the word pictures. For a real scene: `{scene: "pics/room.webp", spots: [{id, x, y}]}` with x/y in % of the picture. |
| `oddOneOut[]` | 3 | `{items: [4 ids from words/extras], odd: id}`. |
| `wordSearch` | 4 | `{size: 8, words: [ids]}`. Words longer than `size` are skipped. Across and down only. |
| `hangman` | 5 | `{words: [ids]}`. |
| `crossword` | 6 | `{words: [ids]}`. Auto-laid out; a word that can't cross another is left out. |
| `expressions[]` | 7 | `{text, audio}`. Tiles are the words split on spaces (punctuation stays on its word). |
| `dialogues[]` | 8 | `{pic, q: {text, audio}, choices: [{text, audio}], answer: index}`. 2 or 3 choices. |
| `questions[]`, `wordAudio`, `picDir`, `lineAudio` | 9 climb | Mountain quiz. Each question: `type` (a renderer in `climb.html` `TYPES`: `listen`, `spell`, `order`, `fill`) and `skill` (which workbook step it reviews). |
| `review` | 9 climb | Notes for the later harder review. To pull from another step, add a renderer to `TYPES` and use its name as `type`. |
| `coach` | all | Coach Ray praise/feedback (Fish 76bb6ae7b26c41fbbd484514fdb014c2): `{dir, right[], wrong[], top[], retry[], next[]}`. One is picked at random each time. Shared by all units, so new units can copy this block as is. |
| `video` | 9 climb | Climber clips `{up, slip, top, poster}`. `up` plays on a right answer, `slip` on a wrong one, `top` at the end on a pass. Shared by all units. |

Audio: Miss Harper (Fish voice 736de7d32d7949469ba4664bce9f3f32). Reuse `../songs/words/*.mp3` first, otherwise
`python3 /workspace/conv-youtube/fish-pack/make_voice.py --voice harper --text "[warm, kind] It is a pen." --out day3/audio/itisapen.mp3`
(every text starts with an [emotion] tag).

Scoring: when a student reaches `passPercent` (80%) during an activity, a big **Next level** button appears and the next step unlocks. They can keep going to 100% for a gold star 🌟 (shown on the hub).
Miss Harper (736de7d32d7949469ba4664bce9f3f32) says the words and sentences being taught. Coach Ray says the praise.

Progress is saved in the browser's localStorage under `mrj_day3_<unit>`. Each step unlocks after the one before is finished. The mountain test needs `passPercent`.
