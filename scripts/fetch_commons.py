"""Wikimedia Commons candidates (CC0 / public domain only) -> work/candidates/<asset>-c/"""
import json, os, sys, urllib.request, urllib.parse, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); out = os.path.join(ROOT, 'work/candidates')
UA = {'User-Agent': 'zaineb-plays/0.1 (personal toddler app; github Asmaasma1111)'}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r: return r.read()
pairs = [a.split('=', 1) for a in sys.argv[1:]]
for asset, q in pairs:
    d = os.path.join(out, asset + '-c'); os.makedirs(d, exist_ok=True)
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=30&gsrsearch=' +
           urllib.parse.quote(f'{q} filetype:bitmap') + '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1024')
    try: res = json.loads(get(url))
    except Exception as e: print(asset, 'API FAIL', e); continue
    meta = []; i = 0
    for pg in (res.get('query', {}).get('pages', {}) or {}).values():
        ii = (pg.get('imageinfo') or [{}])[0]; em = ii.get('extmetadata', {})
        lic = (em.get('LicenseShortName', {}).get('value') or '').strip()
        if lic not in ('CC0', 'Public domain'): continue
        if (ii.get('width') or 0) < 500: continue
        try: data = get(ii['thumburl'])
        except Exception as e: continue
        open(os.path.join(d, f'{i}.jpg'), 'wb').write(data)
        meta.append({'i': i, 'id': pg['title'], 'title': pg['title'].replace('File:', ''), 'creator': (em.get('Artist', {}).get('value') or '')[:120], 'license': 'cc0' if lic == 'CC0' else 'pdm',
                     'license_url': em.get('LicenseUrl', {}).get('value'), 'source': 'wikimedia commons', 'foreign_landing_url': ii.get('descriptionurl'), 'url': ii.get('url'), 'width': ii.get('width'), 'height': ii.get('height')})
        i += 1
        if i >= 6: break
    json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), ensure_ascii=False, indent=1); print(asset, len(meta), 'commons candidates'); time.sleep(1)
