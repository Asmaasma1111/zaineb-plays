"""Lift the clouds out of the 3D backgrounds. The three scenes share one layout, so the cloud boxes are found once on
the day scene and reused; each sprite's alpha is its difference from the sky patched behind it (works for any sky)."""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, 'work/zouzou3d'); OUT = os.path.join(ROOT, 'img/zouzou3d')
day = np.asarray(Image.open(f'{SRC}/bg-day.png').convert('RGB')).astype(np.float32); H, W, _ = day.shape
mx = day.max(-1); mn = day.min(-1); sat = (mx - mn) / np.maximum(mx, 1)
cloud = (mx > 215) & (sat < 0.16); cloud[int(H * 0.62):, :] = False; cloud[:int(H * 0.3), :int(W * 0.2)] = False   # the sun corner
lab, n = ndimage.label(cloud); sizes = ndimage.sum(cloud, lab, range(1, n + 1))
r, g, b = day[..., 0], day[..., 1], day[..., 2]; sy, sx = np.where((r > 200) & (g > 150) & (b < 140) & (np.arange(H)[:, None] < H * .5))
sun = (sx.min() - 60, sy.min() - 60, sx.max() + 60, sy.max() + 60); print('sun box', sun)
boxes = []
for i in np.argsort(sizes)[::-1][:6]:
    if sizes[i] < 1500: continue
    ys, xs = np.where(lab == i + 1); mx_, my_ = int(W * .012), int(H * .02)
    bx = (max(0, xs.min() - mx_), max(0, ys.min() - my_), min(W, xs.max() + mx_), min(H, ys.max() + my_))
    if not (bx[2] < sun[0] or bx[0] > sun[2] or bx[3] < sun[1] or bx[1] > sun[3]): continue      # that is the sun's glow, not a cloud
    boxes.append(bx)
boxes = boxes[:4]
boxes.sort(); print('boxes', boxes)
meta = {}
for name in ['bg-day', 'bg-award', 'bg-night']:
    a = np.asarray(Image.open(f'{SRC}/{name}.png').convert('RGB')).astype(np.float32); filled = a.copy(); sprites = []
    for k, (x0, y0, x1, y1) in enumerate(boxes):
        # sky behind the box: blend of the columns just left and right of the box, row by row
        for y in range(y0, y1):
            l = a[y, max(0, x0 - 3)]; r = a[y, min(W - 1, x1 + 2)]; t = np.linspace(0, 1, x1 - x0)[:, None]
            filled[y, x0:x1] = l * (1 - t) + r * t
        box = a[y0:y1, x0:x1]; sky = filled[y0:y1, x0:x1]
        diff = np.abs(box - sky).max(-1); alpha = np.clip((diff - 10) / 40, 0, 1)
        alpha = ndimage.gaussian_filter(alpha, 1.0); alpha[alpha < .04] = 0
        rgba = np.dstack([box, alpha * 255]).astype(np.uint8); fn = f'{name}-cloud{k + 1}.webp'
        Image.fromarray(rgba, 'RGBA').save(f'{OUT}/{fn}', 'WEBP', quality=85, method=6)
        sprites.append({'file': fn, 'x': round(x0 / W * 100, 2), 'y': round(y0 / H * 100, 2), 'w': round((x1 - x0) / W * 100, 2)})
    Image.fromarray(filled.astype(np.uint8)).resize((1600, int(1600 * H / W)), Image.LANCZOS).save(f'{OUT}/{name}.webp', 'WEBP', quality=80, method=6)
    meta[name] = sprites
json.dump(meta, open(f'{OUT}/clouds.json', 'w'), indent=1); print({k: len(v) for k, v in meta.items()})
