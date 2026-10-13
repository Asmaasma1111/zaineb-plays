"""Compose preview stickers: Fluent 3D art upscaled to 600 px, a white die-cut border, a soft shadow, and kawaii faces on food."""
import os, json
from PIL import Image, ImageFilter, ImageDraw, ImageChops
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, 'work/stickers-src'); OUT = os.path.join(ROOT, 'work/stickers-preview/img')
idx = json.load(open(os.path.join(SRC, 'index.json')))
FACE_ON = {'strawberry': (0.50, 0.58, 1.0), 'red-apple': (0.50, 0.58, 1.0), 'banana': (0.42, 0.55, 0.8), 'peach': (0.50, 0.58, 1.0), 'watermelon': (0.50, 0.55, 0.9),
           'doughnut': None, 'cupcake': (0.50, 0.66, 0.8), 'ice-cream': (0.50, 0.42, 0.8), 'cookie': (0.50, 0.52, 1.0), 'lollipop': (0.50, 0.38, 0.8),
           'candy': (0.50, 0.50, 0.7), 'birthday-cake': (0.50, 0.62, 0.8), 'tangerine': (0.50, 0.58, 1.0), 'grapes': (0.50, 0.60, 0.8), 'cherries': (0.36, 0.66, 0.6),
           'star': (0.50, 0.52, 0.9), 'cloud': (0.50, 0.55, 0.9), 'pink-heart': (0.50, 0.50, 0.9), 'sun': (0.50, 0.50, 0.9), 'moon': (0.56, 0.52, 0.8)}
def kawaii(im, fx, fy, s):
    W = im.width; d = ImageDraw.Draw(im); cx, cy = fx * W, fy * W; e = 0.065 * W * s; r = 0.03 * W * s
    for k in (-1, 1):
        x = cx + k * e; d.ellipse((x - r * .75, cy - r, x + r * .75, cy + r), fill=(60, 45, 35, 255))
        d.ellipse((x + r * .05, cy - r * .7, x + r * .5, cy - r * .25), fill=(255, 255, 255, 255))
        d.ellipse((cx + k * e * 1.9 - r * .9, cy + r * .6, cx + k * e * 1.9 + r * .9, cy + r * 1.6), fill=(255, 143, 163, 150))
    d.arc((cx - r * .9, cy + r * .6, cx + r * .9, cy + r * 2.2), 15, 165, fill=(60, 45, 35, 255), width=max(3, int(W * .012 * s)))
    return im
def compose(key, size=600):
    im = Image.open(os.path.join(SRC, key + '.png')).convert('RGBA')
    bbox = im.getbbox(); im = im.crop(bbox)
    scale = (size * 0.74) / max(im.size); im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0)); ox, oy = (size - im.width) // 2, (size - im.height) // 2
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0)); layer.paste(im, (ox, oy), im)
    if FACE_ON.get(key): layer = kawaii(layer, *FACE_ON[key])
    # die-cut white border: dilate the alpha
    a = layer.split()[3].filter(ImageFilter.MaxFilter(int(size * 0.07) | 1)).filter(ImageFilter.GaussianBlur(1.2))
    border = Image.new('RGBA', (size, size), (255, 255, 255, 255)); border.putalpha(a)
    shadow = Image.new('RGBA', (size, size), (40, 60, 90, 90)); shadow.putalpha(a.filter(ImageFilter.GaussianBlur(10)))
    canvas.alpha_composite(shadow, (0, 10)); canvas.alpha_composite(border); canvas.alpha_composite(layer)
    canvas.save(os.path.join(OUT, key + '.png'))
for key in idx: 
    if os.path.exists(os.path.join(SRC, key + '.png')): compose(key)
print('composed', len([f for f in os.listdir(OUT) if f.endswith('.png')]))
