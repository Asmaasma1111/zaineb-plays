"""Verbatim Arabic transcription of a clip with a text model (separate quota from TTS). Usage: transcribe.py <file> [model]"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for line in open(os.path.join(ROOT, '.env')):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1); os.environ.setdefault(k, v.strip('"'))
from google import genai
from google.genai import types as t
f = sys.argv[1]; model = sys.argv[2] if len(sys.argv) > 2 else 'gemini-3.5-flash-lite'
PROMPT = ('Transcribe this Arabic audio verbatim, exactly as spoken, in Arabic script. Keep dialect words as pronounced; do not correct, '
          'complete or translate. Put each separate utterance on its own line. If a word is cut off, write what you hear followed by [cut]. '
          'If you hear any English or instructions being read aloud, transcribe them too. Reply with the transcript only.')
mime = 'audio/wav' if f.endswith('.wav') else 'audio/mp4'
client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])
r = client.models.generate_content(model=model, contents=[t.Part.from_bytes(data=open(f, 'rb').read(), mime_type=mime), PROMPT])
print(r.text)
