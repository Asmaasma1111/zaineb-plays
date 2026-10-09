"""Turn picks.json choices into img/<asset>.webp (square, 800px, <150 KB) and write credits.json."""
import os, json, io
from PIL import Image, ImageOps
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'work/candidates'); IMG = os.path.join(ROOT, 'img')
plan = json.load(open(os.path.join(ROOT, 'scripts/image_plan.json')))
picks = json.load(open(os.path.join(ROOT, 'scripts/picks.json')))
credits = {'photos': [], 'illustrations': 'Zouzou the camel, the child character, the feelings faces, the shapes and the silly scenes are original SVG drawings made for this app (2026). Font: Baloo Bhaijaan 2 (Ek Type, SIL Open Font License).'}
LIC = {'cc0': ('CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/'), 'pdm': ('Public Domain Mark', 'https://creativecommons.org/publicdomain/mark/1.0/')}
for ph in plan['photos']:
    a = ph['asset']; pk = picks.get(a)
    if pk is None: print('NO PICK', a); continue
    i, fx, fy, zoom, d = (pk, .5, .5, 1, a) if isinstance(pk, int) else (pk['i'], pk.get('fx', .5), pk.get('fy', .5), pk.get('zoom', 1), pk.get('dir', a))
    meta = {m['i']: m for m in json.load(open(os.path.join(C, d, 'meta.json')))}[i]
    im = ImageOps.exif_transpose(Image.open(os.path.join(C, d, f'{i}.jpg')).convert('RGB'))
    w, h = im.size; s = int(min(w, h) / zoom)
    x0 = int((w - s) * fx); y0 = int((h - s) * fy)
    im = im.crop((x0, y0, x0 + s, y0 + s)).resize((800, 800), Image.LANCZOS)
    q = 82
    while True:
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
        if buf.tell() < 150 * 1024 or q <= 40: break
        q -= 8
    open(os.path.join(IMG, a + '.webp'), 'wb').write(buf.getvalue())
    credits['photos'].append({'asset': a, 'cards': ph['cards'], 'title': meta.get('title'), 'creator': meta.get('creator'), 'source': meta.get('source'),
                              'license': LIC[meta['license']][0], 'license_url': LIC[meta['license']][1], 'link': meta.get('foreign_landing_url'), 'via': 'Wikimedia Commons' if d.endswith('-c') else 'Openverse'})
    print(a, i, f'{buf.tell()//1024} KB q{q}')
json.dump(credits, open(os.path.join(ROOT, 'credits.json'), 'w'), ensure_ascii=False, indent=1)
print('credits', len(credits['photos']))
