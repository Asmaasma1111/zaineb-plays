"""Generate one soft cartoon image with Gemini. Usage: gen_image.py <asset> "<prompt>" [model]
Key from .env (GEMINI_API_KEY); never printed. Output: work/gen/<asset>.png"""
import os, sys, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for line in open(os.path.join(ROOT, '.env')):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1); os.environ.setdefault(k, v.strip('"'))
from google import genai
from google.genai import types
asset, prompt = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else 'gemini-3.1-flash-image'
STYLE = ("Children's picture-book illustration for a 3-year-old: {p}. Soft rounded shapes, bright gentle colours, thick clean outlines, "
         "plain light pastel background, one clear subject centred, square composition, friendly and cute, nothing scary, no text, no letters, no watermark.")
client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])
resp = client.models.generate_content(model=model, contents=STYLE.format(p=prompt),
    config=types.GenerateContentConfig(response_modalities=['IMAGE'], image_config=types.ImageConfig(aspect_ratio='1:1')))
out = None
for part in resp.candidates[0].content.parts:
    if getattr(part, 'inline_data', None) and part.inline_data.data:
        out = os.path.join(ROOT, 'work/gen', asset + '.png'); open(out, 'wb').write(part.inline_data.data)
print('saved', out, 'model', model)
