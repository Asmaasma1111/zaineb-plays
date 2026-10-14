#!/bin/sh
# Record, cut and verify Zouzou batches given as arguments, one after the other (Fola voice).
cd "$(dirname "$0")/.."
PY=$HOME/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python
export VOICE=en-us-fola
export STYLE="Warm and exciting kid's voice. You are Zouzou, a giggly little baby camel in a children's game, cheering his best friend, a 3-year-old girl called Zaineb: light, bouncy, delighted, a big smile in the voice, never shouting. Speak in the Setif (eastern Algerian) accent: the letters qaf and the Maghrebi gaf are a hard g, keep the interdentals, jim like French j. Each paragraph is a separate line: pause about two seconds between paragraphs."
export TTS_MODEL=gemini-3.8-flash-lite-tts TTS_TIMEOUT=100
export CHECK_MODELS=gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.5-flash
for b in "$@"; do
  $PY -u scripts/voice.py record "$b" > "work/voice/record-$b.log" 2>&1 || exit 1
  $PY -u scripts/voice.py split "$b" > "work/voice/split-$b.log" 2>&1 || exit 1
  $PY -u scripts/voice.py verify "$b" > "work/voice/verify-$b.log" 2>&1
done
echo ALLDONE >> "work/voice/verify-$b.log"
