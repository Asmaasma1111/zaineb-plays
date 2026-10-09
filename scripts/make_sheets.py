import os, json, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'work/candidates'); OUT = os.path.join(ROOT, 'work/sheets'); os.makedirs(OUT, exist_ok=True)
plan = json.load(open(os.path.join(ROOT, 'scripts/image_plan.json')))
assets = [p['asset'] for p in plan['photos'] if os.path.exists(os.path.join(C, p['asset'], 'meta.json'))]
if sys.argv[1:]: assets = sys.argv[1:]
T = 200; PER = 7
font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
for si in range(0, len(assets), PER):
    group = assets[si:si + PER]
    sheet = Image.new('RGB', (160 + 6 * (T + 8), len(group) * (T + 10)), 'white'); d = ImageDraw.Draw(sheet)
    for r, a in enumerate(group):
        y = r * (T + 10); d.text((8, y + T // 2 - 10), a, fill='black', font=font)
        meta = json.load(open(os.path.join(C, a, 'meta.json')))
        for m in meta:
            fn = os.path.join(C, a, f"{m['i']}.jpg")
            if not os.path.exists(fn): continue
            try: im = Image.open(fn).convert('RGB')
            except Exception: continue
            w, h = im.size; s = min(w, h); im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((T, T))
            x = 160 + m['i'] * (T + 8); sheet.paste(im, (x, y)); d.rectangle((x, y, x + 30, y + 28), fill='yellow'); d.text((x + 8, y + 2), str(m['i']), fill='black', font=font)
    name = os.path.join(OUT, f'sheet-{si // PER + 1}.png'); sheet.save(name); print(name, group)
