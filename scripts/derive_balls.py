"""5-11 switch card without drawings: four real ball photos derived from the CC0 red ball (hue-shifted to yellow/blue, big = full frame, small = 50 %)."""
import os, colorsys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); IMG = os.path.join(ROOT, 'img')
src = Image.open(os.path.join(IMG, 'red-ball.webp')).convert('RGB')
def hue_shift(im, target_h):
    px = im.load(); out = Image.new('RGB', im.size); po = out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b = px[x, y]; h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.25: h = target_h; v = min(1.0, v * (1.35 if target_h < 0.3 else 1.0))   # only the saturated (ball) pixels change colour; yellow needs more light
            rr, gg, bb = colorsys.hsv_to_rgb(h, s, v); po[x, y] = (int(rr * 255), int(gg * 255), int(bb * 255))
    return out
def small(im):
    bg = im.getpixel((10, 10)); canvas = Image.new('RGB', im.size, bg); s = im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS)
    canvas.paste(s, ((im.size[0] - s.size[0]) // 2, (im.size[1] - s.size[1]) // 2)); return canvas
yellow = hue_shift(src, 0.14); blue = hue_shift(src, 0.60)
for name, im in [('ball-big-yellow', yellow), ('ball-small-yellow', small(yellow)), ('ball-big-blue', blue), ('ball-small-blue', small(blue))]:
    im.save(os.path.join(IMG, name + '.webp'), 'WEBP', quality=82, method=6); print('wrote', name)
