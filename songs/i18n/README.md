Lyric translations (display-only, shown small under the English line in songs/play.html).
lyrics-<lang>.json = { "<exact English line text from songs/data/*.json>": "<translation>" } (dedupes repeated lines across songs).
Langs = Word Master LANGS minus en. New/changed lyrics: run build_lyrics_i18n.py from this folder (fills gaps), then write each lang into lyrics-<lang>.json.
