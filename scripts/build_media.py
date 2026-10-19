"""media.json: which picture files each card uses and how the card plays (answers, rules, steps, counts)."""
import os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
plan = json.load(open(os.path.join(ROOT, 'scripts/image_plan.json'))); cards = json.load(open(os.path.join(ROOT, 'zaineb_cards.json')))['cards']
files = {}
for a in plan['photos'] + plan.get('derived', []): files[a['asset']] = a['asset'] + '.webp'
for a in plan['svg'] + plan['generated']: files[a['asset']] = a['asset'] + '.svg'
for f in os.listdir(os.path.join(ROOT, 'img')):
    n, ext = os.path.splitext(f)
    if n not in files: files[n] = f
pics = {}
for kind in ('photos', 'svg', 'generated', 'derived'):
    for a in plan.get(kind, []):
        for c in a['cards']: pics.setdefault(c, []).append(a['asset'])
M = {}
for c in cards:
    M[c['id']] = {'pics': pics.get(c['id'], [])}
O = M
O['1-13']['pics'] = ['face-eye']; O['1-14']['pics'] = ['face-nose']
O['3-07'] = {'pics': ['happy']}; O['3-08'] = {'pics': ['sad']}; O['3-11'] = {'pics': ['funny-faces']}
O['2-08'].update(count=1); O['2-09'].update(count=2); O['2-10'].update(count=3); O['2-11'].update(count=4); O['2-12'].update(count=5, pics=['hand'])
O['4-01'] = {'pics': ['elephant', 'mouse'], 'answer': 'elephant'}
O['4-02'] = {'pics': ['tea', 'ice-cream'], 'answer': 'tea'}
O['4-03'] = {'pics': ['cat-under-table'], 'adult': True}
O['4-04'] = {'pics': ['door-open', 'door-closed'], 'answer': 'door-open'}
O['4-05'] = {'pics': ['full-glass', 'empty-glass'], 'answer': 'full-glass'}
O['4-06'] = {'pics': ['giraffe', 'rabbit'], 'answer': 'giraffe'}
O['4-07'] = {'pics': ['rabbit', 'tortoise'], 'answer': 'rabbit'}
O['4-13'] = {'pics': ['tortoise', 'rabbit']}
O['4-14'] = {'pics': ['clean-hands', 'dirty-hands'], 'answer': 'clean-hands'}
O['5-08'] = {'pics': ['kitten', 'puppy', 'apple'], 'answer': 'apple'}
O['5-09'] = {'pics': ['red-ball', 'apple', 'blue-ball'], 'answer': 'blue-ball'}
O['5-10'] = {'pics': ['banana', 'apple', 'shoe'], 'answer': 'shoe'}
O['5-11'] = {'pics': ['star-big-yellow', 'star-small-blue', 'star-big-blue', 'star-small-yellow'], 'rule1': ['star-big-yellow', 'star-small-yellow'], 'rule2': ['star-small-blue', 'star-small-yellow']}
O['5-12'] = {'pics': ['kitten', 'bread', 'puppy', 'apple'], 'rule1': ['kitten', 'puppy'], 'rule2': ['bread', 'apple']}
O['6-01'] = {'steps': ['seed', 'sprout', 'flower']}; O['6-02'] = {'steps': ['egg', 'chick', 'hen']}; O['6-03'] = {'steps': ['dirty-hands', 'washing-hands', 'clean-hands']}
O['6-04'] = {'steps': ['ice-cream', 'sun', 'melted-ice-cream']}; O['6-05'] = {'steps': ['empty-glass', 'pouring-water', 'full-glass']}; O['6-06'] = {'steps': ['pyjamas', 'toothbrush', 'bed']}
for k, v in json.load(open(os.path.join(ROOT, 'work/new-cards/media_overrides.json'))).items(): O[k] = v   # stages 7-8 + extra cards (19 Oct 2026)
for k, v in M.items():
    v['pics'] = v.get('pics') or v.get('steps')
    for a in (v.get('pics') or []) + (v.get('steps') or []):
        assert a in files, (k, a)
json.dump({'files': files, 'cards': M}, open(os.path.join(ROOT, 'media.json'), 'w'), ensure_ascii=False, indent=0)
print('media.json', len(M), 'cards', len(files), 'files')
