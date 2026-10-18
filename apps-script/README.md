# المزامنة السحابية — Cloud sync for زينب تلعب وتتعلم

One copy of Zaineb's progress (stars, stickers, Leitner boxes) lives in a Google Sheet in Asma's Google account,
behind a tiny Apps Script web app. Safari, the home-screen icon and the laptop all read and write that one copy, so
stickers can no longer vanish when the icon and Safari keep separate storage.

- `Code.gs` — the web app (`load` / `save`, with the same merge rule as `sync.js`). `appsscript.json` — its manifest.
- `../config.js` — the app side: `apiUrl` (the deployed `/exec` URL) and `secret`. **Empty `apiUrl` = no sync at all; the app
  behaves exactly as before.**
- The merge rule: the copy with **more finished sessions** wins; with the same number, the **later change** wins. A finished
  session is never lost. "مسح كل التقدم", "استرجاع من الكود" and "استيراد" overwrite the cloud copy on purpose (force).
- Tabs in the Sheet: **Progress** (one row: the latest copy, when, from which device) and **History** (the last 40 copies
  received, so a wrong overwrite can be undone by hand: copy the `Part …` cells of a good row into the Progress row).

## التنصيب — خطوة بخطوة (مرة واحدة) · Set-up, once

1. **ورقة جديدة · New Sheet.** في حسابك Google افتحي <https://sheets.new>، وسمّيها مثلاً `Zaineb Plays`.
2. **Extensions ▸ Apps Script.** امسحي ما في `Code.gs` والصقي محتوى `apps-script/Code.gs` من هذا المجلد. احفظي (⌘S).
   *(اختياري: Project Settings ▸ "Show appsscript.json" ثم الصقي `apps-script/appsscript.json`.)*
3. **شغّلي `setup` مرة واحدة · Run `setup`.** من القائمة فوق المحرّر اختاري الدالة `setup` ثم **Run**. أول مرة تطلب
   Google إذناً: **Review permissions ▸ حسابك ▸ Advanced ▸ Go to … (unsafe) ▸ Allow**. (هذا تحذير عادي لأي سكربت شخصي.)
   في **Execution log** تحت المحرّر يظهر السطر الجاهز لـ `config.js` مع كلمة السر (`secret`). انسخيه.
4. **Deploy ▸ New deployment.** النوع **Web app**. *Execute as:* **Me**. *Who has access:* **Anyone**. اضغطي **Deploy**
   وانسخي الرابط الذي ينتهي بـ `/exec`.
5. **`config.js`.** ضعي الرابط في `apiUrl` وكلمة السر في `secret`:
   ```js
   window.ZP_CONFIG = { apiUrl: 'https://script.google.com/macros/s/…/exec', family: 'zaineb', secret: '…' };
   ```
   ثم ارفعي للـ GitHub (أو قولي لـ Claude: "ضع هذا الرابط وهذه الكلمة في config.js" وهو يرفع). عند كل تغيير في
   `config.js` يجب رفع رقم `?v=` في `index.html` و `scripts/build_sw.py` وتشغيل `python3 scripts/build_sw.py`.
6. **تحقّق · Check.** افتحي التطبيق، اضغطي على زوزو 3 ثوانٍ ▸ **نسخة احتياطية**: يظهر «☁️ المزامنة السحابية: آخر مزامنة … ✓».
   افتحي الأيقونة على الآيباد: تُطابق سفاري في ثوانٍ. وفي الورقة يظهر صف في **Progress**.

## بعد التنصيب · Day to day

- لا شيء تضغطينه: كل حصّة أو مُلصق أو تغيير إعداد يُرسل بعد ثانيتين. بدون إنترنت يُحفظ ويُرسل عند أول فتح متّصل.
- **مزامنة الآن** (منطقة الوالدين ▸ نسخة احتياطية) تُرسل وتستقبل فوراً.
- جهاز جديد / أيقونة جديدة: افتحيه متّصلاً بالإنترنت مرة واحدة؛ يأخذ النسخة السحابية بصمت.
- لتغيير الكود لاحقاً: الصقي `Code.gs` الجديد ▸ **Deploy ▸ Manage deployments ▸ ✎ ▸ Version: New version ▸ Deploy**
  (الرابط يبقى نفسه). لا تعملي *New deployment* وإلا يتغيّر الرابط.

## Testing without Google

`node scripts/mock_cloud.js` runs the real `Code.gs` against an in-memory Sheet on port 8161 (secret `test-secret`), then open
the app on localhost with `?api=http://127.0.0.1:8161/&secret=test-secret` (that override only works on localhost).
`GET /_dump` shows the sheet. Unit tests: `node --test tests/engine.test.js tests/stickers.test.js tests/sync.test.js`.

## Privacy

Only the progress JSON (card boxes, session dates, stars, stickers, settings) is stored: no names, no recordings, no photos.
The web app URL is unguessable and every request must carry the family `secret`; both are in `config.js`, which is public
on GitHub Pages, so this is a lock against accidents, not against a determined person. Keep the Sheet unshared.
