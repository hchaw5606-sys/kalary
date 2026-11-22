# Kalary — وێنەی مامەڵات | Transaction Photos 📸

بەرنامەیەکی **مۆبایل (PWA)** بۆ وێنەگرتن و بەڕێوەبردنی وێنەی مامەڵات و پسوولەکان.
کار لەسەر **مۆبایل و کۆمپیوتەر** دەکات، ئۆفلاینە، و دەتوانرێت وەک ئەپێکی ئاسایی لەسەر مۆبایل دامەزرێت.

A mobile-first **PWA** for photographing and managing transaction receipts — works on phone & desktop, offline, installable.

---

## ✨ تایبەتمەندییەکان | Features

| | |
|---|---|
| 📷 **وێنەگرتن** | کامێرای زیندوو (live) + گالێری + `capture` بۆ مۆبایل — وێنەکان پەست دەبن بۆ هەڵگرتن |
| 🧾 **مامەڵات** | ناونیشان، بڕ، دراو (IQD/USD/EUR/TRY/SAR/AED)، داهات/خەرجی، پۆل، کەس، بەروار، تێبینی |
| 🏠 **ماڵەوە** | مانەوە، داهات، خەرجی، ژمارە، وێنە، تێکڕا + دوایین مامەڵاتەکان |
| 🔍 **گەڕان و فلتەر** | بە ناو/کەس، بە جۆر، بە پۆل، ڕیزبەندی (نوێ/کۆن/بەرز/نزم)، بینینی گرید/لیست |
| 📊 **ئامار** | بەپێی پۆل (بار)، بەپێی مانگ (چارت)، کۆی گشتی |
| 💾 **هەڵگرتن** | IndexedDB لەسەر ئامێرەکە — ئۆفلاین، بێ سێرڤەر |
| 🔄 **پشتیوانی** | هەناردن/هێنان JSON + CSV |
| 🌐 **زمان** | کوردی (Sorani, RTL) · العربية · English |
| 🌙 **ڕووناکی** | تاریک / ڕوون |
| 📲 **PWA** | دامەزراندن لەسەر مۆبایل (Add to Home Screen)، ئۆفلاین (Service Worker) |
| ↗️ **هاوبەشکردن** | Web Share API + داگرتنی وێنە |

## 📲 چۆن لەسەر مۆبایل دایبنێیت؟ | Install on mobile

1. بەرنامەکە لە براوسەر بکەرەوە (Chrome لە ئەندرۆید / Safari لە ئایفۆن).
2. لە مێنیو **⋮** هەڵبژێرە: **Add to Home screen / زیادکردن بۆ شاشەی ماڵەوە**.
3. ئایکۆنەکە دەردەکەوێت وەک ئەپێکی ئاسایی — ئۆفلاین کار دەکات.

> بۆ ئایفۆن: Share (⬆️) → **Add to Home Screen**.

## ▶️ چۆن بیخەیتە کار؟ | Run locally

```bash
# Python (ئاسانترین)
python3 -m http.server 8000
# پاشان: http://localhost:8000

# یان Node
npx serve .
```

> ⚠️ کامێرای زیندوو پێویستی بە **HTTPS** یان `localhost` هەیە (سیاسەتی براوسەرە). لەسەر مۆبایل، فایلەکە لەسەر سێرڤەرێکی HTTPS دابنێ (GitHub Pages / Netlify / Vercel) — یان گالێری/فایل بەکارهێنە.

## 📁 پێکهاتە | Structure

```
index.html            # ڕووکار (mobile-first, RTL)
manifest.webmanifest  # PWA manifest
sw.js                 # Service Worker (offline cache)
css/style.css         # ستایلەکان (light/dark)
js/app.js             # لۆجیکی سەرەکی: UI, camera, stats, backup
js/db.js              # IndexedDB wrapper
js/i18n.js            # کوردی / عەرەبی / ئینگلیزی
icons/                # ئایکۆنەکانی ئەپ (192/512/maskable/SVG)
```

## 🔒 تایبەتی | Privacy

هەموو داتاکان **تەنها لەسەر ئامێرەکەت** دەمێننەوە (IndexedDB). هیچ سێرڤەرێک نییە، هیچ زانیارییەک نەنێردراوە.

## 📦 بۆ APK؟ | Want a real APK?

ئەم PWA دەتوانرێت بە ئاسانی بگۆڕدرێت بۆ ئەپی ئەندرۆید بە:
- **PWABuilder.com** (خێراترین ڕێگا — PWAیەکە دابنێ → APK دابگرە)، یان
- **Capacitor** (پڕۆژەکە لە WebViewدا دەخاتە ناو ئەپێکی ڕەسەن).

## 📄 مۆڵەت | License
MIT
