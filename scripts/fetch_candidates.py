"""Fetch candidate photos from Openverse (CC0 / PDM only), 6 per asset, into work/candidates/<asset>/.
Anonymous limits: 20/min, 200/day. One API call per asset; image files are downloaded from their hosts."""
import json, os, sys, time, urllib.request, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
plan = json.load(open(os.path.join(ROOT, 'scripts/image_plan.json')))
out = os.path.join(ROOT, 'work/candidates')
only = sys.argv[1:]
UA = {'User-Agent': 'zaineb-plays/0.1 (personal toddler app; contact via github Asmaasma1111)'}
def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r: return r.read()
for p in plan['photos']:
    a = p['asset']
    if only and a not in only: continue
    d = os.path.join(out, a); os.makedirs(d, exist_ok=True)
    if os.path.exists(os.path.join(d, 'meta.json')) and not only: continue
    q = urllib.parse.quote(p['query'])
    url = f"https://api.openverse.org/v1/images/?q={q}&license=cc0,pdm&page_size=20&mature=false&size=medium,large"
    try: res = json.loads(get(url))
    except Exception as e: print(a, 'API FAIL', e); time.sleep(4); continue
    picked = []
    for r in res.get('results', []):
        if r.get('license') not in ('cc0', 'pdm'): continue
        if (r.get('width') or 0) < 500 or (r.get('height') or 0) < 400: continue
        if any(x in (r.get('title') or '').lower() for x in ('vector', 'clipart', 'logo', 'icon')): continue
        picked.append(r)
        if len(picked) >= 6: break
    meta = []
    for i, r in enumerate(picked):
        fn = os.path.join(d, f'{i}.jpg')
        try:
            data = get(r['url'])
            open(fn, 'wb').write(data)
        except Exception as e:
            print(a, i, 'download fail', e); continue
        meta.append({'i': i, 'id': r['id'], 'title': r.get('title'), 'creator': r.get('creator'), 'license': r['license'],
                     'license_url': r.get('license_url'), 'source': r.get('source'), 'foreign_landing_url': r.get('foreign_landing_url'),
                     'url': r['url'], 'width': r.get('width'), 'height': r.get('height')})
    json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
    print(a, len(meta), 'candidates'); sys.stdout.flush()
    time.sleep(float(os.environ.get("PACE","3.5")))
print('done')
