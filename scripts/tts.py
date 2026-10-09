"""Gemini TTS via the interactions API (style annotation is not read aloud).
Usage: tts.py <out.wav> <voice> "<style>" "<text with lines>"   — one request per call. Key from .env, never printed."""
import os, sys, base64, wave, re, time, signal
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for line in open(os.path.join(ROOT, '.env')):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1); os.environ.setdefault(k, v.strip('"'))
from google import genai
MODEL = os.environ.get('TTS_MODEL', 'gemini-3.8-flash-tts'); SR = 24000
out, voice, style, text = sys.argv[1:5]
client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])
def _alarm(*a): raise TimeoutError('hard timeout')
signal.signal(signal.SIGALRM, _alarm)
for attempt in range(2):
    try:
        signal.alarm(int(os.environ.get('TTS_TIMEOUT', '120')))
        it = client.interactions.create(model=MODEL,
            input=[{'type': 'user_input', 'content': [{'type': 'text', 'text': text, 'annotations': [{'type': 'speech_metadata', 'style': style}]}]}],
            response_format={'type': 'audio'}, generation_config={'speech_config': [{'voice': voice}]})
        signal.alarm(0); data = it.output_audio.data; raw = base64.b64decode(data) if isinstance(data, str) else data
        break
    except Exception as e:
        signal.alarm(0); msg = str(e)
        if 'per day' in msg.lower(): print('DAILY QUOTA USED UP for', MODEL); sys.exit(3)
        m = re.search(r'retry in ([\d.]+)s', msg); wait = float(m.group(1)) + 2 if m else 20
        print(f'attempt {attempt+1} failed: {type(e).__name__}: {msg[:160]}; retry in {wait:.0f}s'); time.sleep(wait)
else: sys.exit(2)
if raw[:4] == b'RIFF': open(out, 'wb').write(raw)
else:
    with wave.open(out, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(raw)
print('saved', out, len(raw) // (SR * 2), 's', 'voice', voice, 'model', MODEL)
