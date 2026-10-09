# زينب تلعب وتتعلم

A small offline picture-card app for Zaineb (age 3), played together with an adult on an iPad in landscape.
83 Arabic cards in 6 stages, a baby-camel mascot (Zouzou), spaced review, two 5-minute sessions a day.

- Plain HTML/CSS/JS, no build step. Open `index.html` through any static server (GitHub Pages).
- `zaineb_cards.json` holds every card text; `media.json` maps cards to pictures; `audio/voice.json` maps lines to clips.
- Tests: `node --test tests/engine.test.js`
- Pictures: CC0 / public-domain photos (credits in `credits.json` and in the parent area) plus original SVG drawings.
- Voice: recorded once with Gemini TTS (voice Kore); nothing is generated live and no API key ships with the app.

## Add to the iPad home screen
1. Open the site in Safari on the iPad (landscape).
2. Tap the Share button, then "Add to Home Screen", then "Add".
3. Open it once from the home screen while online so every picture and clip is cached; after that it works in airplane mode.

## Parent area
Press and hold Zouzou on the home screen for 3 seconds.

## Rebuilding after a change
- Pictures: `python3 scripts/process_images.py`, `python3 scripts/draw_svgs.py`, `python3 scripts/build_media.py`
- Voice: `scripts/voice.py lines | record | split | verify | build` (needs `.env` with `GEMINI_API_KEY`, never committed)
- Offline cache: `python3 scripts/build_sw.py` (bump the `?v=` numbers in `index.html` and `scripts/build_sw.py` when css/js change)
