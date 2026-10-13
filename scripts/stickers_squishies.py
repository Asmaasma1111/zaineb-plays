"""Own glitter jelly squishies for Zaineb's sticker book: glossy blobs with kawaii faces (SVG, vector)."""
import os, random, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(ROOT, 'work/stickers-preview/img'); os.makedirs(OUT, exist_ok=True)
random.seed(7)
INK = '#4A3A2A'
def glitter(cx, cy, rx, ry, n, colors):
    out = []
    for _ in range(n):
        a = random.random() * 6.283; r = random.random() ** .5
        x = cx + math.cos(a) * rx * r * .9; y = cy + math.sin(a) * ry * r * .9
        s = random.choice([3, 4, 5, 7]); c = random.choice(colors)
        if s > 5: out.append(f'<path d="M{x} {y-s} L{x+s*.3} {y-s*.3} L{x+s} {y} L{x+s*.3} {y+s*.3} L{x} {y+s} L{x-s*.3} {y+s*.3} L{x-s} {y} L{x-s*.3} {y-s*.3} Z" fill="{c}" opacity=".9"/>')
        else: out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{s/2}" fill="{c}" opacity=".85"/>')
    return ''.join(out)
def face(cx, cy, s=1.0, mouth='smile'):
    e = 26 * s; r = 13 * s
    eyes = ''.join(f'<ellipse cx="{cx+k*e}" cy="{cy}" rx="{r*.75}" ry="{r}" fill="{INK}"/><circle cx="{cx+k*e+r*.3}" cy="{cy-r*.4}" r="{r*.32}" fill="#fff"/><circle cx="{cx+k*e-r*.2}" cy="{cy+r*.3}" r="{r*.15}" fill="#fff"/>' for k in (-1, 1))
    cheeks = ''.join(f'<ellipse cx="{cx+k*e*1.9}" cy="{cy+r*1.1}" rx="{r*.9}" ry="{r*.55}" fill="#FF8FA3" opacity=".65"/>' for k in (-1, 1))
    m = f'<path d="M{cx-9*s} {cy+16*s} Q{cx} {cy+28*s} {cx+9*s} {cy+16*s}" stroke="{INK}" stroke-width="{3.2*s}" fill="none" stroke-linecap="round"/>' if mouth == 'smile' else \
        f'<ellipse cx="{cx}" cy="{cy+20*s}" rx="{7*s}" ry="{9*s}" fill="{INK}"/><ellipse cx="{cx}" cy="{cy+24*s}" rx="{4*s}" ry="{4*s}" fill="#FF8FA3"/>'
    return eyes + cheeks + m
def blob(shape, c1, c2, gl, name, mouth='smile', extra=''):
    W = 400
    if shape == 'round': path = f'<ellipse cx="200" cy="215" rx="150" ry="132"/>'
    elif shape == 'heart': path = '<path d="M200 345 C120 290 48 236 48 160 C48 108 90 70 140 70 C168 70 190 84 200 102 C210 84 232 70 260 70 C310 70 352 108 352 160 C352 236 280 290 200 345 Z"/>'
    elif shape == 'star': path = '<path d="M200 48 L240 150 L348 156 L264 224 L292 332 L200 272 L108 332 L136 224 L52 156 L160 150 Z" stroke-linejoin="round"/>'
    elif shape == 'cloud': path = '<path d="M110 300 C60 300 40 250 70 220 C50 180 90 140 130 155 C140 100 220 90 245 140 C290 120 340 160 325 205 C365 215 365 290 310 300 Z"/>'
    elif shape == 'bunny': path = '<path d="M200 350 C110 350 60 300 60 230 C60 180 95 150 140 150 C120 120 110 60 135 48 C160 40 175 110 178 142 C186 140 214 140 222 142 C225 110 240 40 265 48 C290 60 280 120 260 150 C305 150 340 180 340 230 C340 300 290 350 200 350 Z"/>'
    else: path = '<path d="M200 345 C120 345 55 300 55 230 C55 160 125 85 200 85 C275 85 345 160 345 230 C345 300 280 345 200 345 Z"/>'   # drop/jelly
    body = path.replace('/>', f' fill="url(#g-{name})" stroke="#fff" stroke-width="22" stroke-linejoin="round" paint-order="stroke"/>', 1)
    inner = path.replace('/>', f' fill="url(#g-{name})"/>', 1)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
<defs><radialGradient id="g-{name}" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient>
<clipPath id="c-{name}">{path}</clipPath></defs>
<g filter="drop-shadow(0 6px 6px rgba(0,0,0,.18))">{body}</g>
<g clip-path="url(#c-{name})">{inner}{glitter(200, 215, 150, 130, 70, gl)}
<ellipse cx="150" cy="130" rx="52" ry="26" fill="#fff" opacity=".55" transform="rotate(-20 150 130)"/><ellipse cx="270" cy="300" rx="30" ry="12" fill="#fff" opacity=".3"/></g>
{extra}{face(200, 215, 1.0, mouth)}</svg>'''
    open(os.path.join(OUT, f'sq-{name}.svg'), 'w').write(svg)
blob('round', '#E9C7FF', '#A86BE0', ['#fff', '#FFD6F5', '#C9F0FF', '#FFF3A6'], 'purple')
blob('round', '#FFD3E6', '#FF7FB0', ['#fff', '#FFF3A6', '#C9F0FF'], 'pink', mouth='o')
blob('heart', '#FFB3C7', '#FF5C8A', ['#fff', '#FFE3F0', '#FFF3A6'], 'heart')
blob('star', '#FFF2A8', '#FFC53D', ['#fff', '#FFE8B0', '#FFD6F5'], 'star')
blob('cloud', '#E0F4FF', '#8FD0FF', ['#fff', '#C9F0FF', '#FFD6F5'], 'cloud')
blob('bunny', '#FFF0F6', '#FFC2D9', ['#fff', '#FFD6F5', '#FFF3A6'], 'bunny')
blob('drop', '#D4F7E6', '#5FD39A', ['#fff', '#E6FFF2', '#FFF3A6'], 'mint')
blob('round', '#FFE8C4', '#FFB04D', ['#fff', '#FFF3A6', '#FFD6F5'], 'peach', extra='<path d="M200 90 q6 -30 30 -40" stroke="#5FAE52" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="238" cy="52" rx="20" ry="10" fill="#8BD17C" transform="rotate(-30 238 52)"/>')
blob('round', '#FFFFFF', '#CFEBFA', ['#FFD6F5', '#C9F0FF', '#FFF3A6', '#D9C4FF'], 'rainbow', extra='<path d="M110 150 A90 90 0 0 1 290 150" stroke="#FF6B6B" stroke-width="10" fill="none" opacity=".8"/><path d="M122 150 A78 78 0 0 1 278 150" stroke="#FFD93D" stroke-width="10" fill="none" opacity=".8"/><path d="M134 150 A66 66 0 0 1 266 150" stroke="#6BCB77" stroke-width="10" fill="none" opacity=".8"/><path d="M146 150 A54 54 0 0 1 254 150" stroke="#4D96FF" stroke-width="10" fill="none" opacity=".8"/>')
print('squishies written:', len([f for f in os.listdir(OUT) if f.startswith('sq-')]))
