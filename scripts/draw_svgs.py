"""Original SVG illustrations in Zouzou's style (soft, rounded, thick outlines). Writes img/<asset>.svg"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(ROOT, 'img'); os.makedirs(OUT, exist_ok=True)
INK = '#4A3A2A'; SKIN = '#F6C9A8'; SKIN2 = '#E9B08C'; HAIR_G = '#4B2E1E'; HAIR_B = '#3B2416'; PINK = '#FFB3A7'; RED = '#E8674E'
BG = {'cream': '#FFF6E5', 'sky': '#DFF1FB', 'mint': '#E6F6E3', 'peach': '#FFE9DF', 'lilac': '#EDE7F8', 'sun': '#FFF3C4'}
S = f'stroke="{INK}" stroke-linecap="round" stroke-linejoin="round"'
import re
def _sw(m):
    tag = m.group(0)
    return tag if 'stroke-width' in tag else tag[:-1].rstrip('/') + (' stroke-width="6"/>' if tag.endswith('/>') else ' stroke-width="6">')
def doc(body, bg='cream', w=400):
    body = re.sub(r'<(path|circle|ellipse|rect|polygon)\b[^>]*stroke="#4A3A2A"[^>]*>', _sw, body)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="{w}" height="{w}"><rect width="400" height="400" fill="{BG[bg]}"/>{body}</svg>'
def save(name, body, bg='cream'):
    open(os.path.join(OUT, name + '.svg'), 'w').write(doc(body, bg)); print('wrote', name)

# ---------- the recurring child (girl) and a boy friend ----------
def hair_girl(cx, cy, r):
    curls = ''.join(f'<circle cx="{cx + dx}" cy="{cy + dy}" r="{rr}" fill="{HAIR_G}" {S}/>' for dx, dy, rr in
                    [(-r*0.95, -r*0.25, r*0.32), (r*0.95, -r*0.25, r*0.32), (-r*0.7, -r*0.75, r*0.34), (r*0.7, -r*0.75, r*0.34), (-r*0.3, -r*0.98, r*0.34), (r*0.3, -r*0.98, r*0.34), (0, -r*1.0, r*0.3)])
    return curls
def hair_boy(cx, cy, r):
    return f'<path d="M{cx - r*0.98} {cy - r*0.1} Q{cx - r*0.9} {cy - r*1.05} {cx} {cy - r*1.02} Q{cx + r*0.9} {cy - r*1.05} {cx + r*0.98} {cy - r*0.1} Q{cx + r*0.6} {cy - r*0.55} {cx + r*0.2} {cy - r*0.6} Q{cx - r*0.4} {cy - r*0.55} {cx - r*0.98} {cy - r*0.1} Z" fill="{HAIR_B}" {S}/>'
def eyes(cx, cy, r, kind='open', look=(0, 0)):
    ex = r * 0.38; ey = cy - r * 0.08; er = r * 0.13
    if kind == 'open':
        return ''.join(f'<circle cx="{cx + s*ex}" cy="{ey}" r="{er}" fill="#fff" {S}/><circle cx="{cx + s*ex + look[0]}" cy="{ey + look[1]}" r="{er*0.55}" fill="{INK}"/><circle cx="{cx + s*ex + look[0] + er*0.2}" cy="{ey + look[1] - er*0.25}" r="{er*0.18}" fill="#fff"/>' for s in (-1, 1))
    if kind == 'wide':
        return ''.join(f'<circle cx="{cx + s*ex}" cy="{ey}" r="{er*1.35}" fill="#fff" {S}/><circle cx="{cx + s*ex}" cy="{ey}" r="{er*0.6}" fill="{INK}"/><circle cx="{cx + s*ex + er*0.25}" cy="{ey - er*0.3}" r="{er*0.2}" fill="#fff"/>' for s in (-1, 1))
    if kind == 'happy':  # closed smiling eyes
        return ''.join(f'<path d="M{cx + s*ex - er} {ey + er*0.3} Q{cx + s*ex} {ey - er*1.1} {cx + s*ex + er} {ey + er*0.3}" fill="none" {S}/>' for s in (-1, 1))
    if kind == 'closed':
        return ''.join(f'<path d="M{cx + s*ex - er} {ey - er*0.2} Q{cx + s*ex} {ey + er*0.9} {cx + s*ex + er} {ey - er*0.2}" fill="none" {S}/>' for s in (-1, 1))
    if kind == 'sleepy':
        return ''.join(f'<path d="M{cx + s*ex - er} {ey} Q{cx + s*ex} {ey + er*0.5} {cx + s*ex + er} {ey}" fill="none" {S}/><circle cx="{cx + s*ex}" cy="{ey + er*0.1}" r="{er*0.55}" fill="{INK}" clip-path="inset(45% 0 0 0)"/>' for s in (-1, 1))
def brows(cx, cy, r, kind):
    ex = r * 0.38; by = cy - r * 0.38; w = r * 0.17
    if kind == 'sad':   return ''.join(f'<path d="M{cx + s*(ex - w)} {by - 6} L{cx + s*(ex + w)} {by + 4}" fill="none" {S}/>' for s in (-1, 1))
    if kind == 'angry': return ''.join(f'<path d="M{cx + s*(ex - w)} {by + 8} L{cx + s*(ex + w)} {by - 6}" fill="none" {S}/>' for s in (-1, 1))
    if kind == 'up':    return ''.join(f'<path d="M{cx + s*(ex - w)} {by - 8} Q{cx + s*ex} {by - 18} {cx + s*(ex + w)} {by - 8}" fill="none" {S}/>' for s in (-1, 1))
    return ''
def mouth(cx, cy, r, kind):
    my = cy + r * 0.42
    if kind == 'smile':    return f'<path d="M{cx - r*0.3} {my - 6} Q{cx} {my + r*0.25} {cx + r*0.3} {my - 6}" fill="none" {S}/>'
    if kind == 'laugh':    return f'<path d="M{cx - r*0.36} {my - 8} Q{cx} {my + r*0.42} {cx + r*0.36} {my - 8} Z" fill="{RED}" {S}/><path d="M{cx - r*0.18} {my + r*0.12} Q{cx} {my + r*0.3} {cx + r*0.18} {my + r*0.12}" fill="{PINK}"/>'
    if kind == 'frown':    return f'<path d="M{cx - r*0.26} {my + 10} Q{cx} {my - r*0.2} {cx + r*0.26} {my + 10}" fill="none" {S}/>'
    if kind == 'flat':     return f'<path d="M{cx - r*0.22} {my} L{cx + r*0.22} {my}" fill="none" {S}/>'
    if kind == 'o':        return f'<ellipse cx="{cx}" cy="{my}" rx="{r*0.16}" ry="{r*0.2}" fill="{RED}" {S}/>'
    if kind == 'yawn':     return f'<ellipse cx="{cx}" cy="{my}" rx="{r*0.22}" ry="{r*0.3}" fill="{RED}" {S}/><ellipse cx="{cx}" cy="{my + r*0.15}" rx="{r*0.12}" ry="{r*0.08}" fill="{PINK}"/>'
    if kind == 'small-o':  return f'<ellipse cx="{cx}" cy="{my}" rx="{r*0.1}" ry="{r*0.12}" fill="{RED}" {S}/>'
    return ''
def face(cx=200, cy=200, r=95, who='girl', eye='open', brow='', m='smile', look=(0, 0), skin=SKIN, blush=True):
    hair_back = f'<circle cx="{cx}" cy="{cy - r*0.1}" r="{r*1.08}" fill="{HAIR_G}" {S}/>' if who == 'girl' else ''
    head = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{skin}" {S}/>'
    ears = ''.join(f'<circle cx="{cx + s*r*0.98}" cy="{cy + r*0.05}" r="{r*0.16}" fill="{skin}" {S}/>' for s in (-1, 1))
    hair = hair_girl(cx, cy, r) if who == 'girl' else hair_boy(cx, cy, r)
    cheeks = ''.join(f'<circle cx="{cx + s*r*0.55}" cy="{cy + r*0.25}" r="{r*0.14}" fill="{PINK}" opacity=".8"/>' for s in (-1, 1)) if blush else ''
    nose = f'<path d="M{cx - r*0.07} {cy + r*0.12} Q{cx} {cy + r*0.22} {cx + r*0.07} {cy + r*0.12}" fill="none" {S}/>'
    return hair_back + ears + head + hair + cheeks + eyes(cx, cy, r, eye, look) + brows(cx, cy, r, brow) + nose + mouth(cx, cy, r, m)
def body(cx=200, top=290, color='#FF8A71', w=150):
    return f'<path d="M{cx - w/2} 400 L{cx - w/2 + 10} {top + 30} Q{cx} {top - 10} {cx + w/2 - 10} {top + 30} L{cx + w/2} 400 Z" fill="{color}" {S}/>'
def hand(x, y, r=22, skin=SKIN): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{skin}" {S}/>'
def tear(x, y): return f'<path d="M{x} {y} q-9 14 0 22 q9 -8 0 -22 Z" fill="#7EC8F2" {S}/>'

# ---------- feelings (girl + boy, alternating like the cards) ----------
save('happy', body(color='#FF8A71') + face(who='girl', eye='happy', m='laugh'), 'sun')
save('sad', body(color='#9ED3F0') + face(who='girl', eye='open', brow='sad', m='frown', look=(0, 5)) + tear(150, 215) , 'lilac')
save('angry', body(color='#8BD17C') + face(who='boy', eye='open', brow='angry', m='flat', skin='#F4A98F') +
     ''.join(f'<path d="M{x} {y} q6 -10 0 -20 q-6 -10 0 -20" fill="none" {S} opacity=".5"/>' for x, y in [(110, 90), (290, 90)]), 'peach')
save('scared', body(color='#FFD95A') + face(who='girl', eye='wide', brow='up', m='small-o') +
     # teddy hugged in front
     f'<circle cx="200" cy="350" r="40" fill="#C8955B" {S}/><circle cx="170" cy="320" r="13" fill="#C8955B" {S}/><circle cx="230" cy="320" r="13" fill="#C8955B" {S}/>'
     f'<circle cx="188" cy="345" r="4" fill="{INK}"/><circle cx="212" cy="345" r="4" fill="{INK}"/><ellipse cx="200" cy="360" rx="9" ry="6" fill="#8A5A2B" {S}/>' + hand(150, 345) + hand(250, 345)
     + ''.join(f'<path d="M{x} {y} q-6 12 0 18 q6 -6 0 -18 Z" fill="#7EC8F2" {S}/>' for x, y in [(318, 120), (330, 150)]), 'sky')
save('tired', body(color='#6FA8DC') + face(who='boy', eye='sleepy', brow='up', m='yawn') + hand(258, 285, 24) +
     f'<g font-family="Baloo Bhaijaan 2, sans-serif" font-weight="800" fill="#6FA8DC"><text x="300" y="110" font-size="40">z</text><text x="330" y="80" font-size="52">z</text></g>', 'lilac')
save('surprised', body(color='#FF8A71') + face(who='girl', eye='wide', brow='up', m='o') + hand(120, 300) + hand(280, 300), 'sun')
save('funny-faces', ''.join(f'<g transform="translate({tx} {ty}) scale(.5)">{face(who="girl", eye=e, brow=b, m=m)}</g>' for tx, ty, e, b, m in
     [(0, 60, 'happy', '', 'laugh'), (200, 60, 'open', 'sad', 'frown'), (100, 200, 'wide', 'up', 'o')]), 'mint')
# gift: happy girl holding a wrapped gift
save('gift', body(color='#8BD17C') + face(cx=200, cy=180, r=90, who='girl', eye='happy', m='laugh') +
     f'<rect x="130" y="300" width="140" height="90" rx="14" fill="#FF8A71" {S}/><rect x="188" y="300" width="24" height="90" fill="#FFD95A" {S}/>'
     f'<path d="M200 300 q-30 -40 -10 -40 q14 0 10 40 q30 -40 10 -40 q-14 0 -10 40" fill="#FFD95A" {S}/>' + hand(118, 330) + hand(282, 330), 'sun')
# ball-pool: sad boy, ball floating in a small pool
save('ball-pool', f'<ellipse cx="290" cy="340" rx="100" ry="40" fill="#9ED3F0" {S}/><circle cx="300" cy="325" r="30" fill="#FF8A71" {S}/><path d="M300 295 q10 30 0 60 M270 325 q30 -10 60 0" fill="none" {S}/>'
     + body(cx=140, top=270, color='#6FA8DC', w=130) + face(cx=140, cy=170, r=85, who='boy', eye='open', brow='sad', m='frown', look=(4, 4)) + tear(100, 190), 'mint')
# sleeping: boy in bed, teddy
save('sleeping', f'<rect x="40" y="250" width="320" height="110" rx="30" fill="#9ED3F0" {S}/><rect x="60" y="300" width="280" height="70" rx="20" fill="#FFD95A" {S}/>'
     f'<ellipse cx="120" cy="250" rx="60" ry="26" fill="#fff" {S}/>' + face(cx=120, cy=215, r=62, who='boy', eye='closed', m='smile') +
     f'<circle cx="250" cy="275" r="26" fill="#C8955B" {S}/><circle cx="232" cy="256" r="8" fill="#C8955B" {S}/><circle cx="268" cy="256" r="8" fill="#C8955B" {S}/><circle cx="243" cy="272" r="3" fill="{INK}"/><circle cx="257" cy="272" r="3" fill="{INK}"/>'
     f'<g font-family="Baloo Bhaijaan 2, sans-serif" font-weight="800" fill="#6FA8DC"><text x="230" y="150" font-size="40">z</text><text x="265" y="110" font-size="52">z</text><text x="310" y="70" font-size="64">z</text></g>', 'lilac')
# body-part faces: girl pointing to her eye / touching her nose
save('face-eye', body(color='#FF8A71') + face(who='girl', eye='open', m='smile') + f'<circle cx="163" cy="192" r="22" fill="none" stroke="#FFD95A" stroke-width="8"/>' +
     f'<path d="M100 330 Q140 260 158 214" fill="none" stroke="{SKIN}" stroke-width="26" stroke-linecap="round"/><path d="M100 330 Q140 260 158 214" fill="none" {S} stroke-width="38" opacity="0"/>' + hand(160, 212, 16), 'sun')
save('face-nose', body(color='#8BD17C') + face(who='girl', eye='happy', m='smile') + f'<circle cx="200" cy="218" r="18" fill="none" stroke="#FFD95A" stroke-width="8"/>' +
     f'<path d="M300 330 Q260 270 215 232" fill="none" stroke="{SKIN}" stroke-width="26" stroke-linecap="round"/>' + hand(212, 230, 16), 'mint')
# freeze dance: girl frozen mid-dance, music notes
save('freeze', body(cx=200, top=270, color='#FF8A71') + face(cx=200, cy=170, r=85, who='girl', eye='wide', m='o') +
     f'<path d="M135 290 L70 230" stroke="{SKIN}" stroke-width="26" stroke-linecap="round"/><path d="M265 290 L330 220" stroke="{SKIN}" stroke-width="26" stroke-linecap="round"/>' + hand(66, 226) + hand(334, 216) +
     f'<g fill="{INK}"><circle cx="60" cy="110" r="12"/><path d="M72 110 V60 l30 -8 v50" fill="none" {S}/><circle cx="102" cy="102" r="12"/><circle cx="330" cy="130" r="11"/><path d="M341 130 V85" fill="none" {S}/></g>' +
     f'<text x="200" y="385" text-anchor="middle" font-family="Baloo Bhaijaan 2, sans-serif" font-size="0"></text>', 'sun')
# clapping
save('clapping', body(cx=200, top=280, color='#6FA8DC') + face(cx=200, cy=175, r=85, who='boy', eye='happy', m='laugh') +
     f'<path d="M140 300 L175 330" stroke="{SKIN}" stroke-width="26" stroke-linecap="round"/><path d="M260 300 L225 330" stroke="{SKIN}" stroke-width="26" stroke-linecap="round"/>' + hand(185, 335, 24) + hand(215, 335, 24) +
     ''.join(f'<path d="M{x} {y} l0 -18 M{x} {y} l-12 -12 M{x} {y} l12 -12" fill="none" stroke="#F5B820" stroke-width="6" stroke-linecap="round"/>' for x, y in [(150, 330), (250, 330)]), 'mint')
# bedtime steps
save('pyjamas', f'<path d="M120 90 L160 70 Q200 95 240 70 L280 90 L300 150 L265 160 L265 240 L135 240 L135 160 L100 150 Z" fill="#9ED3F0" {S}/>'
     f'<path d="M160 70 Q200 95 240 70 Q200 130 160 70" fill="#fff" {S}/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="9" fill="#FFD95A" {S}/>' for x, y in [(150, 130), (210, 120), (250, 180), (175, 200)]) +
     f'<path d="M140 250 L140 360 L185 360 L200 280 L215 360 L260 360 L260 250 Z" fill="#9ED3F0" {S}/>', 'lilac')
save('toothbrush', f'<rect x="80" y="170" width="250" height="44" rx="22" fill="#6FA8DC" {S}/><rect x="60" y="150" width="90" height="84" rx="22" fill="#fff" {S}/>'
     + ''.join(f'<rect x="{70 + i*12}" y="128" width="8" height="28" rx="4" fill="#fff" {S} stroke-width="4"/>' for i in range(6)) +
     f'<path d="M68 118 q40 -30 76 0 q-10 -22 -38 -22 q-28 0 -38 22 Z" fill="#8BD17C" {S}/>', 'sky')
save('bed', f'<rect x="60" y="150" width="280" height="150" rx="26" fill="#FF8A71" {S}/><rect x="60" y="230" width="280" height="90" rx="20" fill="#FFD95A" {S}/>'
     f'<ellipse cx="130" cy="170" rx="55" ry="26" fill="#fff" {S}/><rect x="50" y="300" width="20" height="60" rx="8" fill="#C8955B" {S}/><rect x="330" y="300" width="20" height="60" rx="8" fill="#C8955B" {S}/>'
     f'<path d="M300 70 a36 36 0 1 0 30 56 a28 28 0 1 1 -30 -56 Z" fill="#FFD95A" {S}/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="5" fill="#FFD95A"/>' for x, y in [(80, 60), (120, 100), (230, 50)]), 'lilac')

# ---------- silly scenes ----------
def shoe(x, y, color='#E8674E', flip=False):
    sx = -1 if flip else 1
    return f'<g transform="translate({x} {y}) scale({sx} 1)"><path d="M0 0 h40 q30 0 40 20 v10 h-80 Z" fill="{color}" {S}/><rect x="-2" y="-18" width="26" height="22" rx="8" fill="{color}" {S}/><path d="M6 -8 h12" {S}/></g>'
save('fish-shoes', f'<path d="M80 200 Q180 90 290 200 Q180 310 80 200 Z" fill="#FF8A71" {S}/><path d="M290 200 L350 150 L345 250 Z" fill="#FF8A71" {S}/>'
     f'<path d="M180 120 Q210 90 230 135" fill="#FFD95A" {S}/><circle cx="130" cy="185" r="16" fill="#fff" {S}/><circle cx="133" cy="187" r="7" fill="{INK}"/><path d="M95 220 q15 12 30 0" fill="none" {S}/>'
     + ''.join(f'<path d="M{x} 200 q10 -10 20 0 q-10 10 -20 0" fill="#FFD95A" {S} stroke-width="4"/>' for x in (190, 225, 255)) + shoe(130, 300) + shoe(230, 300) +
     ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" {S} stroke-width="4"/>' for x, y, r in [(340, 90, 10), (360, 60, 7)]), 'sky')
save('cow-meow', f'<ellipse cx="190" cy="250" rx="120" ry="90" fill="#fff" {S}/><ellipse cx="150" cy="270" rx="40" ry="30" fill="{INK}" opacity=".85"/><ellipse cx="250" cy="230" rx="30" ry="24" fill="{INK}" opacity=".85"/>'
     f'<circle cx="110" cy="170" r="60" fill="#fff" {S}/><ellipse cx="100" cy="195" rx="36" ry="22" fill="#FFB3A7" {S}/><circle cx="90" cy="195" r="4" fill="{INK}"/><circle cx="112" cy="195" r="4" fill="{INK}"/>'
     f'<circle cx="92" cy="155" r="9" fill="#fff" {S}/><circle cx="94" cy="156" r="4" fill="{INK}"/><circle cx="126" cy="155" r="9" fill="#fff" {S}/><circle cx="128" cy="156" r="4" fill="{INK}"/>'
     f'<path d="M70 125 q-20 -25 -10 -40 q15 10 20 35 M150 125 q20 -25 10 -40 q-15 10 -20 35" fill="#F3C98B" {S}/><circle cx="60" cy="150" r="12" fill="#FFB3A7" {S}/><circle cx="160" cy="150" r="12" fill="#FFB3A7" {S}/>'
     + ''.join(f'<rect x="{x}" y="300" width="22" height="60" rx="10" fill="#fff" {S}/>' for x in (110, 150, 220, 260)) +
     f'<path d="M190 80 h160 a24 24 0 0 1 24 24 v50 a24 24 0 0 1 -24 24 h-110 l-30 24 v-24 h-20 a24 24 0 0 1 -24 -24 v-50 a24 24 0 0 1 24 -24 Z" fill="#fff" {S}/>'
     f'<circle cx="272" cy="130" r="26" fill="#F3C98B" {S}/><path d="M252 112 l-6 -20 l20 10 M292 112 l6 -20 l-20 10" fill="#F3C98B" {S}/><circle cx="263" cy="127" r="3.5" fill="{INK}"/><circle cx="281" cy="127" r="3.5" fill="{INK}"/><path d="M265 140 q7 6 14 0" fill="none" {S} stroke-width="4"/>', 'mint')
save('banana-hat', body(color='#8BD17C') + face(cx=200, cy=210, r=90, who='girl', eye='happy', m='laugh') +
     f'<path d="M110 120 Q200 40 300 110 Q290 90 200 70 Q120 85 110 120 Z" fill="#FFD95A" {S}/><path d="M118 118 Q200 60 292 112" fill="none" {S} stroke-width="4" opacity=".5"/><path d="M296 104 l14 -10" {S}/>', 'sun')
save('flying-puppy', f'<ellipse cx="200" cy="230" rx="90" ry="60" fill="#C8955B" {S}/><circle cx="120" cy="190" r="55" fill="#C8955B" {S}/>'
     f'<path d="M80 150 q-30 -10 -30 40 q0 30 25 20 Z" fill="#8A5A2B" {S}/><path d="M160 150 q30 -10 30 40 q0 30 -25 20 Z" fill="#8A5A2B" {S}/>'
     f'<circle cx="105" cy="185" r="8" fill="#fff" {S}/><circle cx="107" cy="186" r="4" fill="{INK}"/><circle cx="135" cy="185" r="8" fill="#fff" {S}/><circle cx="137" cy="186" r="4" fill="{INK}"/>'
     f'<ellipse cx="100" cy="212" rx="12" ry="8" fill="{INK}"/><path d="M100 220 q10 14 22 4" fill="none" {S}/><path d="M120 228 q4 14 -6 20" fill="#FF8A71" {S}/>'
     f'<path d="M230 185 q20 -70 70 -40 q-10 40 -60 50 Z" fill="#fff" {S}/><path d="M230 185 q-20 -70 -10 -90 q30 20 20 90 Z" fill="#fff" {S}/>'
     f'<path d="M290 230 q40 -10 40 20" fill="none" {S} stroke-width="10"/>' + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="30" ry="14" fill="#fff" {S} stroke-width="4"/>' for x, y in [(60, 330), (330, 340), (200, 360)]), 'sky')
save('fork-milk', f'<path d="M130 150 h140 l-15 190 q-55 20 -110 0 Z" fill="#fff" {S}/><path d="M136 190 h128 l-11 148 q-53 16 -106 0 Z" fill="#F4F4F0" stroke="none"/>'
     f'<path d="M140 190 h120 l-11 150 q-49 16 -98 0 Z" fill="#FFFFFF" stroke="none"/><path d="M130 150 q70 25 140 0" fill="none" {S}/>'
     f'<rect x="196" y="110" width="12" height="190" rx="6" fill="#B0B8C0" {S}/><rect x="176" y="60" width="52" height="70" rx="12" fill="#B0B8C0" {S}/>' + ''.join(f'<rect x="{x}" y="20" width="9" height="46" rx="4" fill="#B0B8C0" {S} stroke-width="4"/>' for x in (180, 195, 210)) +
     f'<text x="200" y="380" text-anchor="middle" font-family="Baloo Bhaijaan 2, sans-serif" font-size="0"></text>', 'peach')
save('camel-sea', f'<rect x="0" y="250" width="400" height="150" fill="#9ED3F0"/>' + ''.join(f'<path d="M{x} 262 q20 -14 40 0 q20 14 40 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' for x in (-10, 80, 170, 260, 350)) +
     f'<ellipse cx="220" cy="250" rx="110" ry="50" fill="#F3C98B" {S}/><ellipse cx="250" cy="205" rx="40" ry="30" fill="#E0AD66" {S}/>'
     f'<circle cx="120" cy="170" r="58" fill="#F3C98B" {S}/><ellipse cx="108" cy="195" rx="30" ry="20" fill="#FAE1B6" {S}/>'
     f'<path d="M85 130 q-18 -22 -5 -36 q12 10 12 34 M155 130 q18 -22 5 -36 q-12 10 -12 34" fill="#F3C98B" {S}/>'
     f'<circle cx="100" cy="158" r="17" fill="#CFEBFA" stroke="#2F6FA8" stroke-width="7"/><circle cx="142" cy="158" r="17" fill="#CFEBFA" stroke="#2F6FA8" stroke-width="7"/><path d="M117 158 h8" stroke="#2F6FA8" stroke-width="7"/><path d="M83 150 q-20 -10 -25 10" fill="none" stroke="#2F6FA8" stroke-width="7"/>'
     f'<circle cx="102" cy="160" r="5" fill="{INK}"/><circle cx="144" cy="160" r="5" fill="{INK}"/><path d="M95 200 q13 10 26 0" fill="none" {S} stroke-width="4"/>'
     f'<circle cx="300" cy="300" r="22" fill="#FF8A71" {S}/><path d="M290 300 q10 -10 20 0 M295 310 q5 6 10 0" fill="none" {S} stroke-width="4"/>', 'sky')
save('rabbit-carrot', f'<ellipse cx="200" cy="370" rx="170" ry="30" fill="#8BD17C"/><ellipse cx="170" cy="270" rx="80" ry="65" fill="#fff" {S}/><circle cx="110" cy="200" r="55" fill="#fff" {S}/>'
     f'<path d="M85 150 q-12 -90 20 -80 q14 20 8 80 Z" fill="#fff" {S}/><path d="M92 152 q-6 -70 14 -64 q8 16 4 64 Z" fill="#FFB3A7" stroke="none"/><path d="M128 150 q12 -90 -20 -80 q-14 20 -8 80 Z" fill="#fff" {S}/>'
     f'<circle cx="92" cy="198" r="8" fill="#fff" {S}/><circle cx="94" cy="199" r="4" fill="{INK}"/><circle cx="124" cy="198" r="8" fill="#fff" {S}/><circle cx="126" cy="199" r="4" fill="{INK}"/><ellipse cx="108" cy="220" rx="7" ry="5" fill="#FFB3A7" {S} stroke-width="4"/>'
     f'<path d="M108 225 v10 M100 240 q8 6 16 0" fill="none" {S} stroke-width="4"/><path d="M60 215 l-25 -5 M60 222 l-25 5 M156 215 l25 -5 M156 222 l25 5" {S} stroke-width="4"/>'
     f'<circle cx="240" cy="300" r="20" fill="#fff" {S}/><circle cx="150" cy="320" r="26" fill="#fff" {S}/>'
     f'<path d="M300 330 l40 -90 l20 95 Z" fill="#F59E55" {S}/><path d="M340 240 q-20 -30 -40 -20 q25 5 40 20 M340 240 q20 -30 40 -20 q-25 5 -40 20 M340 240 q0 -30 0 -40" fill="#8BD17C" {S}/>'
     f'<circle cx="330" cy="150" r="22" fill="none" stroke="{INK}" stroke-width="7"/><path d="M346 166 l24 24" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>', 'sun')
save('kitten-story', f'<path d="M40 60 h320 a20 20 0 0 1 20 20 v240 a20 20 0 0 1 -20 20 h-320 a20 20 0 0 1 -20 -20 v-240 a20 20 0 0 1 20 -20 Z" fill="#fff" {S}/><path d="M200 60 v280" {S} stroke-dasharray="10 10"/>'
     f'<ellipse cx="120" cy="250" rx="55" ry="45" fill="#F3C98B" {S}/><circle cx="110" cy="190" r="42" fill="#F3C98B" {S}/>'
     f'<path d="M80 165 l-8 -35 l30 18 Z M140 165 l8 -35 l-30 18 Z" fill="#F3C98B" {S}/><circle cx="96" cy="185" r="7" fill="#fff" {S} stroke-width="4"/><circle cx="97" cy="186" r="3.5" fill="{INK}"/><circle cx="124" cy="185" r="7" fill="#fff" {S} stroke-width="4"/><circle cx="125" cy="186" r="3.5" fill="{INK}"/>'
     f'<path d="M110 200 l-5 6 h10 Z" fill="#FFB3A7" {S} stroke-width="3"/><path d="M104 212 q6 6 12 0" fill="none" {S} stroke-width="4"/><path d="M170 260 q40 -30 30 -60" fill="none" {S} stroke-width="10"/>'
     f'<circle cx="290" cy="130" r="28" fill="#FFD95A" {S}/>' + ''.join(f'<path d="M{x} {y} l6 12 l13 2 l-9 9 l2 13 l-12 -6 l-12 6 l2 -13 l-9 -9 l13 -2 Z" fill="#FFD95A" {S} stroke-width="4"/>' for x, y in [(240, 200), (320, 220), (280, 270)]) +
     f'<path d="M210 320 h150" {S} stroke-width="4" opacity=".4"/><path d="M210 300 h150" {S} stroke-width="4" opacity=".4"/>', 'lilac')

# ---------- shapes and stars ----------
save('circle', f'<circle cx="200" cy="200" r="130" fill="#FF8A71" {S} stroke-width="10"/>', 'cream')
save('square', f'<rect x="75" y="75" width="250" height="250" rx="18" fill="#6FA8DC" {S} stroke-width="10"/>', 'cream')
def star(cx, cy, r, color):
    import math
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * 0.45
        pts.append(f'{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}')
    return f'<polygon points="{" ".join(pts)}" fill="{color}" {S} stroke-width="10"/>'
save('star-big-yellow', star(200, 210, 150, '#FFD95A')); save('star-small-blue', star(200, 205, 80, '#6FA8DC'))
save('star-big-blue', star(200, 210, 150, '#6FA8DC')); save('star-small-yellow', star(200, 205, 80, '#FFD95A'))

# ---------- doors (no CC0 open-door photo found) ----------
def door(open_):
    frame = f'<rect x="90" y="40" width="220" height="330" rx="14" fill="#C8955B" {S}/><rect x="110" y="60" width="180" height="310" fill="#8A5A2B" stroke="none"/>'
    if open_:
        inside = f'<rect x="110" y="60" width="180" height="310" fill="#DFF1FB" stroke="none"/><circle cx="200" cy="130" r="30" fill="#FFD95A" {S}/><ellipse cx="200" cy="370" rx="90" ry="24" fill="#8BD17C" stroke="none"/>'
        leaf = f'<path d="M110 60 L210 100 L210 400 L110 370 Z" fill="#E8674E" {S}/><circle cx="195" cy="240" r="8" fill="#FFD95A" {S} stroke-width="4"/>'
        return frame + inside + leaf
    leaf = f'<rect x="110" y="60" width="180" height="310" fill="#E8674E" {S}/><rect x="130" y="85" width="140" height="110" rx="8" fill="none" {S} stroke-width="4"/><rect x="130" y="220" width="140" height="120" rx="8" fill="none" {S} stroke-width="4"/><circle cx="265" cy="215" r="9" fill="#FFD95A" {S} stroke-width="4"/>'
    return frame + leaf
save('door-open', door(True), 'cream'); save('door-closed', door(False), 'cream')

# ---------- melted ice cream (no CC0 photo of a dripping cone was found) ----------
save('melted-ice-cream', f'<ellipse cx="200" cy="330" rx="120" ry="34" fill="#FFB3A7" {S}/><path d="M150 100 L200 340 L250 100 Z" fill="#E0AD66" {S}/>'
     f'<path d="M160 160 L240 160 M165 200 L235 200 M172 240 L228 240 M158 130 L190 300 M242 130 L210 300" {S} stroke-width="3" opacity=".5"/>'
     f'<ellipse cx="200" cy="100" rx="58" ry="44" fill="#FF8A71" {S}/><path d="M150 112 q10 50 0 70 q-14 -10 -10 -70 Z M250 112 q-12 44 0 72 q14 -12 8 -72 Z M196 136 q6 40 -4 60 q-12 -12 -4 -60 Z" fill="#FF8A71" {S}/>'
     f'<path d="M172 90 q28 -14 56 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/><circle cx="330" cy="70" r="36" fill="#FFD95A" {S}/>' +
     ''.join(f'<path d="M{330+48*dx:.0f} {70+48*dy:.0f} L{330+62*dx:.0f} {70+62*dy:.0f}" stroke="#F5B820" stroke-width="6" stroke-linecap="round"/>' for dx, dy in [(1,0),(0,-1),(-1,0),(0.7,-0.7),(-0.7,-0.7),(0.7,0.7),(-0.7,0.7),(0,1)]), 'sky')
