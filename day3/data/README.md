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
| `map` | 2 | Hotspot picture quiz. `{scene, hotspots:[{id, x, y, w, h}]}`. See "Map scenes" below. `{scene: null}` falls back to a grid of the word pictures. |
| `voices` | all | `{default:"us_f", dir:"audio/v/", ai:"audio/ai/"}`. See "Voices" below. |
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


## Map scenes (hotspots)
One big picture that holds every object of the unit, each clearly separate (Unit 6: `pics/scene_classroom.webp`, a classroom). Ideas for other units: a funny big person for body parts, a fruit market for fruit, a zoo for animals, a kitchen for food.
```json
"map": {"scene": "pics/scene_classroom.webp", "hotspots": [
  {"id": "mouse", "x": 46, "y": 63.5, "w": 10, "h": 10},
  {"id": "desk",  "x": 16, "y": 60,   "w": 61.5, "h": 36.5}
]}
```
- `id` is a word id from `words`. `x, y` is the top-left corner and `w, h` is the size, all in **% of the picture** (so the picture's pixel size does not matter).
- The student hears a word and must tap that object. If boxes overlap, the **smallest** box wins, so a mouse on a desk works.
- Only words that have a hotspot are asked. To find the numbers, open the picture in any editor and divide pixel positions by the width or height.

## Voices
- Students pick the voice that reads everything taught (hub, or the 🗣️ button on every page). The choice is saved in `localStorage` key `mrj_day3_voice` and is shared by every unit and step. It is the same set as Word Master / Day 2: `us_f` Miss Harper (default), `us_m` Coach Ray, `grandma` Grandma June, `grandpa` Grandpa Walt, `robot` KITT.
- Keep audio paths in the JSON as `audio/<name>.mp3` or `../songs/words/<word>.mp3`. The engine plays `audio/v/<voice>/<name>.mp3` instead, so **every taught mp3 must exist in all 5 voice folders**. Copy from `../packs/<unit>/audio/<voice>/` first, then make the rest with Fish TTS (each text starts with an [emotion] tag).
- Praise always uses Coach Ray (`coach`, `audio/ray/`). Dialogue answers always use the AI voice (Day 6 Talk AI, Jay TTS `a79698cbbba6435d86ee335fbd999c41`): `audio/ai/<same file name as the choice audio>`. Dialogue questions use the student's voice.

## Hangman styles
Before playing, the student picks a style: classic hangman (simple cartoon), snowman melting in the sun, balloon popping, or ice cream melting. The choice is saved in `mrj_day3_hangstyle`, and the 🎨 button changes it. No JSON is needed.

## Phase 2 units (all books)
- Built by /workspace/day3-inventory/build_unit.py from packs/<unit>.json plus a per-book spec (model sentences, dialogues).
- Word pictures and word audio are used in place from the Day 2 pack: `../packs/<unit>/<id>.jpg`, `../packs/<unit>/audio/{v}/<id>.mp3`.
- `{v}` in any audio path is replaced by the chosen voice (us_f, us_m, grandma, grandpa, robot).
- New clips: `audio/<unit>/{v}/<name>.mp3` (sentences, questions) and `audio/<unit>/ai/<name>.mp3` (AI answers, Jay TTS).
- A word with no picture (`pic: null`) shows a Korean-meaning card and is left out of map, odd-one-out and listen questions.
- Scenes: `pics/<unit>/scene.webp` with hotspots in `data/<unit>.map.json`. No map file = picture-grid map.
- `units.html` lists every unit (from data/units.json, made by make_units.py).
