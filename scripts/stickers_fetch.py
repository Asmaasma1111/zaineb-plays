"""Download candidate Fluent Emoji 3D assets (MIT) for Zaineb's sticker book into work/stickers-src/."""
import os, urllib.request, urllib.parse, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(ROOT, 'work/stickers-src')
CANDIDATES = {   # key: (Fluent asset folder, kind)
 'strawberry': ('Strawberry', 'food'), 'red-apple': ('Red apple', 'food'), 'banana': ('Banana', 'food'), 'cherries': ('Cherries', 'food'),
 'peach': ('Peach', 'food'), 'watermelon': ('Watermelon', 'food'), 'doughnut': ('Doughnut', 'food'), 'cupcake': ('Cupcake', 'food'),
 'ice-cream': ('Soft ice cream', 'food'), 'cookie': ('Cookie', 'food'), 'lollipop': ('Lollipop', 'food'), 'candy': ('Candy', 'food'),
 'birthday-cake': ('Birthday cake', 'food'), 'tangerine': ('Tangerine', 'food'), 'grapes': ('Grapes', 'food'),
 'panda': ('Panda', 'animal'), 'koala': ('Koala', 'animal'), 'hamster': ('Hamster', 'animal'), 'rabbit': ('Rabbit face', 'animal'),
 'cat': ('Cat face', 'animal'), 'dog': ('Dog face', 'animal'), 'bear': ('Bear', 'animal'), 'chick': ('Front-facing baby chick', 'animal'),
 'hatching-chick': ('Hatching chick', 'animal'), 'penguin': ('Penguin', 'animal'), 'duck': ('Duck', 'animal'), 'frog': ('Frog', 'animal'),
 'pig': ('Pig face', 'animal'), 'monkey': ('Monkey face', 'animal'), 'butterfly': ('Butterfly', 'animal'), 'ladybug': ('Lady beetle', 'animal'),
 'turtle': ('Turtle', 'animal'), 'fish': ('Tropical fish', 'animal'), 'dolphin': ('Dolphin', 'animal'), 'otter': ('Otter', 'animal'),
 'sloth': ('Sloth', 'animal'), 'seal': ('Seal', 'animal'), 'camel': ('Camel', 'animal'), 'cow': ('Cow face', 'animal'), 'sheep': ('Ewe', 'animal'),
 'unicorn': ('Unicorn', 'sparkly'), 'star': ('Star', 'sparkly'), 'glowing-star': ('Glowing star', 'sparkly'), 'rainbow': ('Rainbow', 'sparkly'),
 'sparkling-heart': ('Sparkling heart', 'sparkly'), 'pink-heart': ('Pink heart', 'sparkly'), 'sparkles': ('Sparkles', 'sparkly'),
 'moon': ('Crescent moon', 'sparkly'), 'sun': ('Sun', 'sparkly'), 'cloud': ('Cloud', 'sparkly'), 'balloon': ('Balloon', 'sparkly'),
 'teddy': ('Teddy bear', 'animal'), 'ribbon': ('Ribbon', 'sparkly'), 'shooting-star': ('Shooting star', 'sparkly'), 'gift': ('Wrapped gift', 'sparkly'),
}
base = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/'
ok = fail = 0
for key, (folder, kind) in CANDIDATES.items():
    out = os.path.join(OUT, key + '.png')
    if os.path.exists(out): ok += 1; continue
    slug = folder.lower().replace(' ', '_').replace('-', '_')
    url = base + urllib.parse.quote(folder) + '/3D/' + slug + '_3d.png'
    try: urllib.request.urlretrieve(url, out); ok += 1
    except Exception as e: print('MISS', key, folder, e); fail += 1
print('fetched', ok, 'missing', fail)
import json; json.dump({k: {'folder': v[0], 'kind': v[1]} for k, v in CANDIDATES.items()}, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
