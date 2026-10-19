"""Voice pipeline for زينب تلعب وتتعلم (Gemini TTS, Kore, Algerian Darja).
  lines            -> work/voice/lines.json  (every line to record, deduped by text) + batches.json
  record [b..]     -> work/voice/takes/bNN.wav   one TTS request per batch (10/day/model on this key)
  split b..        -> cut a take into clips by transcript matching; work/voice/clips.json
  verify [b..]     -> transcribe every clip strictly; list failures
  build            -> audio/*.m4a + audio/voice.json
"""
import os, sys, json, re, time, wave, base64, tempfile, subprocess, unicodedata, signal
from difflib import SequenceMatcher
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, 'work/voice'); SR = 24000
for line in open(os.path.join(ROOT, '.env')):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1); os.environ.setdefault(k, v.strip('"'))
TTS_MODEL = os.environ.get('TTS_MODEL', 'gemini-3.8-flash-tts'); VOICE = os.environ.get('VOICE', 'Kore'); BATCH = int(os.environ.get('BATCH', '17')); CHARS = int(os.environ.get('CHARS', '800'))
STYLE = ("A warm, cheerful young mother from Sétif in eastern Algeria talking slowly and playfully to her 3-year-old daughter. "
         "Use the Sétif (eastern Algerian, Hilalian) accent, not Egyptian, Levantine or Standard Arabic: pronounce ق as a hard g "
         "(قطة = gaṭṭa, تقول = tgūl, قريب = grīb) and ڨ always as g; keep the interdentals ث and ذ (ثلاثة = thlātha, هذي = hādhi); "
         "pronounce ج as the French j; ضُرك = ḍork; نتي = nti; كيما = kīma; واش = wāsh; ما عندهاش = ma ʿandhāsh. Short vowels are "
         "reduced like in Algerian speech. Laugh gently where the text says هههه. Each paragraph is a separate line: pause about two seconds between paragraphs.")
STYLE = os.environ.get('STYLE', STYLE)
KEEP_Q = {'قدم', 'القدم', 'قفي', 'قفز', 'مغلق', 'المغلق', 'البطريق', 'بطريق', 'دقايق', 'دقيقة', 'ملصق', 'الملصق', 'ملصقات', 'الملصقات', 'ملصقين',
          'قميص', 'القميص', 'قميصك', 'قدر', 'القدر', 'قبعة', 'القبعة', 'طبق', 'أطباق', 'قطار', 'كأسان', 'قليل', 'اثنان', 'اِثْنَان', 'برتقالي'}   # فصحى nouns/numbers (Asma, 19 Oct 2026): spoken with q      # Standard-Arabic labels and loans that keep q in Sétif
def tts_form(text):
    """What the voice is given: her text respelled the Sétif way. Displayed text is never changed."""
    out = []
    for tok in text.split(' '):
        base = TASHKEEL.sub('', re.sub(r'[^\u0621-\u064A\u064B-\u0652\u0670]', '', tok))
        out.append(tok if base in KEEP_Q else tok.replace('ق', 'ڨ'))
    t = ' '.join(out).replace(' / ', '... ')      # slashed labels: a pause, not a slash the voice may skip
    t = re.sub(r'(?<![\u0621-\u064A])(ال)?م[ُ]?ل[ْ]?ص[َ]?ق(ات|ين)?(?![\u0621-\u064A])', lambda m: (m.group(1) or '') + 'مُلْصَق' + (m.group(2) or ''), t)   # مُلْصَق: damma, no shadda
    t = re.sub(r'(?<![\u0621-\u064A])([وف]?)درك(?![\u0621-\u064A])', r'\1ضُرك', t)
    t = re.sub(r'(?<![\u0621-\u064A])اثنين(?![\u0621-\u064A])', 'زوج', t)
    return t
CHECK_MODELS = [m for m in os.environ.get('CHECK_MODELS', 'gemini-3-flash-preview,gemini-3.5-transcribe,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.5-flash').split(',') if m]
STRICT = ('Transcribe this short Arabic clip verbatim in Arabic script, exactly as spoken, dialect words as pronounced. Do not correct, '
          'complete, translate or add anything. If the first or last word is cut off, write the part you hear followed by [cut]. '
          'Reply with the words only, or "-" if silent.')

def load(p, d): return json.load(open(p)) if os.path.exists(p) else d
def dump(p, o): json.dump(o, open(p, 'w'), ensure_ascii=False, indent=1)
def read_wav(p):
    with wave.open(p, 'rb') as w: x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x
def write_wav(p, x):
    with wave.open(p, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
def envelope(x, hop=0.01):
    h = int(hop * SR); n = max(1, len(x) // h); return np.sqrt(np.mean(x[:n * h].reshape(n, h) ** 2, axis=1))
def thr(env): return max(0.004, 0.06 * (np.percentile(env, 95) if len(env) else 0))
def runs(mask):
    out, i = [], 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j < len(mask) and mask[j]: j += 1
            out.append((i, j)); i = j
        else: i += 1
    return out

# ---------- Arabic normalisation ----------
TASHKEEL = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]')
SUBS = [('ڨ', 'ق'), ('واش', 'وش'), ('هذي', 'هادي'), ('هذا', 'هاد'), ('هذو', 'هادو'), ('كيما', 'كما'), ('درك', 'ضرك'), ('ولّا', 'ولا'), ('ئ', 'ء'), ('ؤ', 'ء')]
DIGITS = {'1': 'واحد', '2': 'زوج', '3': 'ثلاثة', '4': 'أربعة', '5': 'خمسة', '6': 'ستة', '7': 'سبعة', '8': 'ثمانية', '9': 'تسعة', '10': 'عشرة', '11': 'حداش', '12': 'طناش',
          '13': 'طلطاش', '14': 'ربعطاش', '15': 'خمسطاش', '16': 'سطاش', '17': 'سبعطاش', '18': 'ثمنطاش', '19': 'تسعطاش', '20': 'عشرين', '21': 'واحد وعشرين', '22': 'زوج وعشرين',
          '23': 'ثلاثة وعشرين', '24': 'أربعة وعشرين', '25': 'خمسة وعشرين', '26': 'ستة وعشرين', '27': 'سبعة وعشرين', '28': 'ثمانية وعشرين', '29': 'تسعة وعشرين', '30': 'ثلاثين',
          '31': 'واحد وثلاثين', '32': 'زوج وثلاثين', '33': 'ثلاثة وثلاثين', '34': 'أربعة وثلاثين', '35': 'خمسة وثلاثين', '36': 'ستة وثلاثين', '37': 'سبعة وثلاثين', '38': 'ثمانية وثلاثين', '39': 'تسعة وثلاثين', '40': 'أربعين'}
def norm(t):
    t = TASHKEEL.sub('', t or '').replace('[cut]', '')
    t = re.sub(r'[٠-٩]', lambda m: str('٠١٢٣٤٥٦٧٨٩'.index(m.group(0))), t)
    t = re.sub(r'\d+', lambda m: DIGITS.get(m.group(0), m.group(0)), t)
    t = re.sub(r'[أإآٱ]', 'ا', t).replace('ة', 'ه').replace('ى', 'ي')
    t = re.sub(r'[^ء-ي\s]', ' ', t)
    for a, b in SUBS: t = t.replace(a, b)
    t = re.sub(r'(.)\1{2,}', r'\1\1', t)          # مووو -> موو, هههه -> هه
    return ' '.join(t.split())
def sim(a, b): return SequenceMatcher(None, norm(a).replace(' ', ''), norm(b).replace(' ', '')).ratio()

# ---------- lines ----------
def cmd_lines(a):
    d = json.load(open(os.path.join(ROOT, 'zaineb_cards.json')))
    E = {}; lines = []
    def add(key, text, kind):
        n = norm(text)
        if n in E: E[n]['keys'].append(key); return
        E[n] = {'key': key, 'keys': [key], 'text': text.strip(), 'tts': tts_form(text.strip()), 'kind': kind}; lines.append(E[n])
    for c in d['cards']:
        add(f'c:{c["id"]}:ask', c['ask'], 'ask'); add(f'c:{c["id"]}:reveal', c['reveal'], 'reveal'); add(f'c:{c["id"]}:word', c['word'], 'word')
        if c.get('mission'): add(f'mission:{c["id"]}', c['mission'], 'mission')
    for i, t in enumerate(d['feedback_lines']['correct']): add(f'fb:correct:{i}', t, 'fb')
    for i, t in enumerate(d['feedback_lines']['try_again']): add(f'fb:try:{i}', t, 'fb')
    add('fb:session_end', d['feedback_lines']['session_end'], 'fb'); add('fb:rest', d['feedback_lines']['rest'], 'fb'); add('fb:stage_done', d['feedback_lines']['stage_done'], 'fb')
    for i, t in enumerate(['واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة']): add(f'count:{i+1}', t, 'count')
    for i, t in enumerate(['جيبيلي حاجة صفراء!', 'جيبيلي حاجة حمراء!', 'وريني حاجة مدوّرة!', 'نقزي ثلاث مرات!', 'روحي اعطي حضن لماما!']): add(f'mission:default:{i}', t, 'mission')
    nums = ['ملصق واحد', 'زوج ملصقات', 'ثلاثة ملصقات', 'أربعة ملصقات', 'خمسة ملصقات', 'ستة ملصقات', 'سبعة ملصقات', 'ثمانية ملصقات', 'تسعة ملصقات', 'عشرة ملصقات',
            'حداش ملصق', 'طناش ملصق', 'طلطاش ملصق', 'ربعطاش ملصق', 'خمسطاش ملصق', 'سطاش ملصق', 'سبعطاش ملصق', 'ثمنطاش ملصق', 'تسعطاش ملصق', 'عشرين ملصق',
            'واحد وعشرين ملصق', 'زوج وعشرين ملصق', 'ثلاثة وعشرين ملصق', 'أربعة وعشرين ملصق', 'خمسة وعشرين ملصق', 'ستة وعشرين ملصق', 'سبعة وعشرين ملصق', 'ثمانية وعشرين ملصق',
            'تسعة وعشرين ملصق', 'ثلاثين ملصق', 'واحد وثلاثين ملصق', 'زوج وثلاثين ملصق', 'ثلاثة وثلاثين ملصق', 'أربعة وثلاثين ملصق', 'خمسة وثلاثين ملصق', 'ستة وثلاثين ملصق',
            'سبعة وثلاثين ملصق', 'ثمانية وثلاثين ملصق', 'تسعة وثلاثين ملصق', 'أربعين ملصق']
    for i, t in enumerate(nums): add(f'st:count:{i+1}', f'عندك {t}!'.replace('ملصق', 'مُلصق'), 'st')
    for k, t in [('st:win', 'زينب ربحتي مُلصق!'), ('st:look', 'واو! شوفي المُلصق!'), ('st:stick', 'نلصقوه في الدفتر!'), ('st:giggle', 'هههه!'), ('st:book', 'هذا دفتر المُلصقات تاعك!'), ('st:open', 'افتحي الهدية!')]: add(k, t, 'st')
    for i, t in enumerate(['أهلاً زينب! نلعبو؟', 'يا زينب! نلعبو مرة أخرى؟', 'نرتاحو شويا... ونعاودو من بعد!', 'بدلنا اللعبة!', 'خذيتي نجمة!', 'آني راقد زينب... مباعدة نلعبوا... زززز', 'آآآه... راني فقت! نلعبو؟']): add(f'ui:{i}', t, 'ui')
    # batches: keep order, cap by characters so every take stays ~1.5-2 min
    batches, cur, chars = [], [], 0
    for l in lines:
        if cur and (len(cur) >= BATCH or chars + len(l['text']) > CHARS): batches.append(cur); cur, chars = [], 0
        cur.append(l['key']); chars += len(l['text'])
    if cur: batches.append(cur)
    dump(os.path.join(W, 'lines.json'), lines); dump(os.path.join(W, 'batches.json'), {f'b{i+1:02d}': b for i, b in enumerate(batches)})
    print(len(lines), 'unique lines in', len(batches), 'batches')

def by_key(): return {l['key']: l for l in load(os.path.join(W, 'lines.json'), [])}

# ---------- record ----------
def synth(text):
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=os.environ['GEMINI_API_KEY'], http_options=types.HttpOptions(timeout=240000, retry_options=types.HttpRetryOptions(attempts=1)))
    def _alarm(*a): raise TimeoutError('TTS request exceeded the hard timeout')
    signal.signal(signal.SIGALRM, _alarm)
    for attempt in range(3):
        try:
            signal.alarm(int(os.environ.get('TTS_TIMEOUT', '200')))
            it = client.interactions.create(model=TTS_MODEL,
                input=[{'type': 'user_input', 'content': [{'type': 'text', 'text': text, 'annotations': [{'type': 'speech_metadata', 'style': STYLE}]}]}],
                response_format={'type': 'audio'}, generation_config={'speech_config': [{'voice': VOICE}]})
            signal.alarm(0)
            data = it.output_audio.data; return base64.b64decode(data) if isinstance(data, str) else data
        except Exception as e:
            signal.alarm(0); msg = str(e)
            if 'per day' in msg.lower(): raise SystemExit(f'DAILY QUOTA USED UP for {TTS_MODEL}')
            m = re.search(r'retry in ([\d.]+)s', msg); wait = float(m.group(1)) + 2 if m else 20
            print(f'  attempt {attempt+1} failed: {type(e).__name__}: {msg[:160]}; retry in {wait:.0f}s', flush=True); time.sleep(wait)
    raise SystemExit('TTS failed 3 times')
def synth_patient(text):
    while True:
        try: return synth(text)
        except SystemExit as e:
            print('  quota/hang —', e, '— waiting 10 min', flush=True); time.sleep(600)
def cmd_record(a):
    B = load(os.path.join(W, 'batches.json'), {}); L = by_key(); todo = a or list(B)
    for b in todo:
        out = os.path.join(W, 'takes', b + '.wav')
        if os.path.exists(out): print(b, 'exists'); continue
        text = '\n\n'.join(L[k]['tts'] for k in B[b])
        raw = synth_patient(text)
        if raw[:4] == b'RIFF': open(out, 'wb').write(raw)
        else:
            with wave.open(out, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(raw)
        meta = load(os.path.join(W, 'takes.json'), {}); meta[b] = {'model': TTS_MODEL, 'voice': VOICE, 'seconds': len(raw) // (SR * 2), 'at': time.strftime('%Y-%m-%d %H:%M')}; dump(os.path.join(W, 'takes.json'), meta)
        print(b, len(B[b]), 'lines ->', len(raw) // (SR * 2), 's', TTS_MODEL, flush=True)

# ---------- ear ----------
class Ear:
    def __init__(self):
        from google import genai
        from google.genai import types
        self.t = types; self.mi = 0; self.n = 0
        self.client = genai.Client(api_key=os.environ['GEMINI_API_KEY'], http_options=types.HttpOptions(timeout=90000, retry_options=types.HttpRetryOptions(attempts=1)))
    def hear(self, x):
        pad = np.zeros(int(0.5 * SR), np.float32)
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'p.wav'); write_wav(p, np.concatenate([pad, x, pad])); data = open(p, 'rb').read()
        t = self.t
        for tries in range(60):
            model = CHECK_MODELS[self.mi % len(CHECK_MODELS)]
            try:
                r = self.client.models.generate_content(model=model, contents=[t.Part.from_bytes(data=data, mime_type='audio/wav'), STRICT],
                    config=t.GenerateContentConfig(temperature=0, automatic_function_calling=t.AutomaticFunctionCallingConfig(disable=True)))
                self.n += 1; return (r.text or '').strip()
            except Exception as e:
                msg = str(e)
                daily = 'per day' in msg.lower() or 'PerDay' in msg
                if daily or '404' in msg or 'NOT_FOUND' in msg:
                    self.dead = getattr(self, 'dead', set()) | {model}
                    if len(self.dead) >= len(CHECK_MODELS):
                        print('  all transcription models exhausted — waiting 15 min', flush=True); time.sleep(900); self.dead = set()
                    self.mi += 1; continue
                m = re.search(r'retry in ([\d.]+)s', msg); time.sleep(min(float(m.group(1)) + 1 if m else 8, 70)); self.mi += 1
        raise SystemExit('transcription kept failing')

# ---------- split ----------
def pieces_of(q):
    ps = [(s, e) for s, e in runs(~q) if (e - s) * 0.01 > 0.12]; merged = []
    for s, e in ps:
        if merged and (s - merged[-1][1]) * 0.01 < 0.30: merged[-1] = (merged[-1][0], e)
        else: merged.append((s, e))
    return merged
def match(x, q, lines, ear, log):
    merged = pieces_of(q); heard = []
    for s, e in merged:
        h = ear.hear(x[max(0, int((s * 0.01 - 0.05) * SR)):int((e * 0.01 + 0.05) * SR)])
        heard.append(norm(h) if h.strip() not in ('-', '?') else ''); log(f'  piece {s*0.01:6.2f}-{e*0.01:6.2f}  {h[:60]}')
    L = [norm(l.get('tts', l['text'])).replace(' ', '') for l in lines]; H = [h.replace(' ', '') for h in heard]
    N, M, K = len(merged), len(lines), 8; NEG = -1e9
    dp = np.full((N + 1, M + 1), NEG); bk = {}; dp[0][0] = 0
    for i in range(N + 1):
        for j in range(M + 1):
            if dp[i][j] == NEG: continue
            if i < N and dp[i][j] - 0.6 > dp[i + 1][j]: dp[i + 1][j] = dp[i][j] - 0.6; bk[(i + 1, j)] = ('skip', i, j)
            if j < M and dp[i][j] - 1.0 > dp[i][j + 1]: dp[i][j + 1] = dp[i][j] - 1.0; bk[(i, j + 1)] = ('miss', i, j)
            if j < M:
                for k in range(1, K + 1):
                    if i + k > N: break
                    sc = SequenceMatcher(None, L[j], ''.join(H[i:i + k])).ratio() * 2 - 0.05 * (k - 1)
                    if dp[i][j] + sc > dp[i + k][j + 1]: dp[i + k][j + 1] = dp[i][j] + sc; bk[(i + k, j + 1)] = ('take', i, j)
    i, j, spans = N, M, [(None, None, '')] * M
    while (i, j) != (0, 0):
        kind, pi, pj = bk[(i, j)]
        if kind == 'take': spans[pj] = (merged[pi][0], merged[i - 1][1], ' '.join(heard[pi:i]))
        i, j = pi, pj
    return spans
def reach(q, i, stop, step, pause):
    while i != stop:
        if (q[i:i + pause] if step > 0 else q[max(0, i - pause):i]).all(): return i
        i += step
    return None
def fix_cuts(q, spans, pause=25, far=60, brk=12):
    out = [list(s) for s in spans]; found = [s for s in out if s[0] is not None]; quiet = runs(q)
    for a, b in zip(found, found[1:]):
        if b[0] - a[1] >= pause: continue
        m = (a[1] + b[0]) // 2
        near = [(s, e) for s, e in quiet if e - s >= brk and e > m - far and s < m + far and a[0] < (s + e) // 2 < b[1]]
        if near:
            s, e = min(near, key=lambda r: abs((r[0] + r[1]) // 2 - m)); a[1] = b[0] = (s + e) // 2
    for k, sp in enumerate(found):
        s, e = sp[0], sp[1]
        lo = max(s - far, (found[k - 1][1] + s) // 2 if k else 0); hi = min(e + far, (e + found[k + 1][0]) // 2 if k + 1 < len(found) else len(q))
        f = reach(q, e, hi, 1, pause); g = reach(q, s, lo, -1, pause)
        sp[1] = min(f + 10, hi) if f is not None else min(e + 15, hi); sp[0] = max(g - 10, lo) if g is not None else max(s - 15, lo)
    return [tuple(s) for s in out]
def cmd_split(a):
    B = load(os.path.join(W, 'batches.json'), {}); L = by_key(); clips = load(os.path.join(W, 'clips.json'), {}); ear = Ear()
    for b in a:
        x = read_wav(os.path.join(W, 'takes', b + '.wav')); env = envelope(x); q = env < thr(env)
        lines = [L[k] for k in B[b]]; log = lambda s: print(s, flush=True)
        print(b, len(lines), 'lines', f'{len(x)/SR:.1f}s')
        spans = fix_cuts(q, match(x, q, lines, ear, log))
        for l, (s, e, h) in zip(lines, spans):
            if s is None: print('  MISSING', l['key'], l['text']); clips[l['key']] = {'batch': b, 'missing': True}; continue
            y = x[int(s * 0.01 * SR):int(e * 0.01 * SR)]; write_wav(os.path.join(W, 'clips', slug(l['key']) + '.wav'), y)
            clips[l['key']] = {'batch': b, 'start': round(s * 0.01, 2), 'end': round(e * 0.01, 2), 'heard': h, 'sim': round(sim(l.get('tts', l['text']), h), 2), 'text': l['text']}
        dump(os.path.join(W, 'clips.json'), clips); print(b, 'done; ear calls', ear.n)
def slug(key): return re.sub(r'[^a-z0-9]+', '-', key.lower()).strip('-')

# ---------- verify ----------
def cmd_verify(a):
    L = by_key(); clips = load(os.path.join(W, 'clips.json'), {}); ear = Ear(); fails = []
    for k, c in clips.items():
        if a and c.get('batch') not in a: continue
        if c.get('missing'): fails.append((k, 'missing', '')); continue
        if 'verified' in c and not os.environ.get('REVERIFY'): continue
        h = ear.hear(read_wav(os.path.join(W, 'clips', slug(k) + '.wav'))); s = sim(L[k].get('tts', L[k]['text']), h)
        c['verify_heard'] = h; c['verify_sim'] = round(s, 2); c['verified'] = s >= 0.72 and '[cut]' not in h
        print(('ok  ' if c['verified'] else 'FAIL'), f'{s:.2f}', k, '|', L[k].get('tts', L[k]['text']), '|', h, flush=True)
        if not c['verified']: fails.append((k, h, L[k].get('tts', L[k]['text'])))
        dump(os.path.join(W, 'clips.json'), clips)
    print('\nFAILURES:', len(fails))
    for f in fails: print(' ', f)

# ---------- build ----------
def cmd_build(a):
    L = by_key(); clips = load(os.path.join(W, 'clips.json'), {}); out = os.path.join(ROOT, 'audio'); os.makedirs(out, exist_ok=True); man = {}
    for l in L.values():
        c = clips.get(l['key'])
        if not c or c.get('missing'): continue
        if c.get('text') and norm(c['text']) != norm(l['text']): print('STALE CLIP (text changed, re-record):', l['key'], '|', c['text'], '->', l['text']); continue
        if not c.get('verified') and not (os.environ.get('PREVIEW') and c.get('sim', 0) >= 0.8): continue
        fn = slug(l['key']) + '.m4a'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(W, 'clips', slug(l['key']) + '.wav'), '-c:a', 'aac', '-b:a', '64k', os.path.join(out, fn)], check=True)
        for k in l['keys']: man[k] = fn
    dump(os.path.join(out, 'voice.json'), man); print(len(man), 'keys ->', len(set(man.values())), 'files')

if __name__ == '__main__':
    cmd = sys.argv[1]; args = sys.argv[2:]
    {'lines': cmd_lines, 'record': cmd_record, 'split': cmd_split, 'verify': cmd_verify, 'build': cmd_build}[cmd](args)
