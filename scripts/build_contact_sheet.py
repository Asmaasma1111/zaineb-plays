"""contact-sheet.html: every card with its word and the picture(s) it will use."""
import os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, 'zaineb_cards.json'))); plan = json.load(open(os.path.join(ROOT, 'scripts/image_plan.json')))
by_card = {}
for kind in ('photos', 'svg', 'generated', 'derived'):
    for a in plan[kind]:
        for c in a['cards']: by_card.setdefault(c, []).append((a['asset'], 'webp' if kind in ('photos', 'derived') else 'svg'))
# the truth is media.json (what the app shows)
M = json.load(open(os.path.join(ROOT, 'media.json')))
by_card = {cid: [(a, M['files'][a].rsplit('.', 1)[1]) for a in v['pics']] for cid, v in M['cards'].items()}
rows = []
for lv in d['levels']:
    rows.append(f'<h2>المرحلة {lv["stage"]}: {lv["name"]}</h2><div class="grid">')
    for c in [c for c in d['cards'] if c['stage'] == lv['stage']]:
        pics = by_card.get(c['id'], [])
        imgs = ''.join(f'<img src="img/{a}.{ext}" alt="{a}" title="{a}" onerror="this.classList.add(\'missing\')">' for a, ext in pics)
        rows.append(f'<div class="card"><div class="pics n{len(pics)}">{imgs or "<div class=missing>؟</div>"}</div><div class="w">{c["word"]}</div><div class="id">{c["id"]} · {c["type"]} · {" / ".join(a for a,_ in pics)}</div></div>')
    rows.append('</div>')
html = f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>الصور — زينب تلعب وتتعلم</title><link rel="stylesheet" href="fonts/fonts.css">
<style>body{{font-family:'Baloo Bhaijaan 2',sans-serif;background:#CFEBFA;margin:0;padding:16px;color:#3E3230}}h1{{margin:0 0 8px}}h2{{margin:18px 0 8px;font-size:26px}}
.grid{{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}}.card{{background:#fff;border-radius:18px;padding:8px;text-align:center;box-shadow:0 4px 14px rgba(50,90,120,.15)}}
.pics{{display:grid;gap:4px;aspect-ratio:1;background:#f3f3f3;border-radius:12px;overflow:hidden}}.pics.n2{{grid-template-columns:1fr 1fr}}.pics.n3{{grid-template-columns:1fr 1fr 1fr;aspect-ratio:3/1.2}}.pics.n4{{grid-template-columns:1fr 1fr}}
.pics img{{width:100%;height:100%;object-fit:cover;display:block}}.pics img.missing{{opacity:.15}}.missing{{font-size:60px;display:flex;align-items:center;justify-content:center}}
.w{{font-size:30px;font-weight:800;margin-top:4px}}.id{{font-size:12px;color:#8a7f7a;direction:ltr}}</style></head><body>
<h1>الصور المقترحة لكل بطاقة (83)</h1><p>الصور الحقيقية: Openverse (CC0 / ملك عام). الرسوم: مرسومة خصيصاً للتطبيق بأسلوب زوزو.</p>{''.join(rows)}</body></html>'''
open(os.path.join(ROOT, 'contact-sheet.html'), 'w').write(html); print('written')
