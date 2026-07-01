# بناء تطبيق سطح المكتب (Windows)

## المتطلبات

1. **Node.js** (الإصدار 18 أو أحدث) — [تنزيل من nodejs.org](https://nodejs.org)
2. **Git** — [تنزيل من git-scm.com](https://git-scm.com)

## خطوات البناء

### الطريقة السريعة (ملف Batch)

1. افتح المجلد الذي يحتوي على الملفات
2. انقر مرتين على ملف `BUILD-DESKTOP.bat`
3. انتظر حتى ينتهي البناء
4. ستجد ملف الإعداد في مجلد `electron-app\release\`

### الطريقة اليدوية

```bat
# 1. تثبيت الحزم
pnpm install

# 2. بناء السيرفر
pnpm --filter @workspace/api-server run build

# 3. بناء الواجهة
set PORT=8080
set BASE_PATH=/
pnpm --filter @workspace/pos-system run build

# 4. تجميع ملفات التطبيق
node scripts/build-desktop.mjs

# 5. بناء ملف الإعداد
cd electron-app
pnpm install
pnpm run build:app
```

## نتيجة البناء

بعد اكتمال البناء ستجد في مجلد `electron-app\release\`:

- **`OmniSystem Setup x.x.x.exe`** — ملف الإعداد للتنصيب على Windows

## ملاحظات

- عند فتح التطبيق سيظهر **شاشة تحميل** ثم يفتح التطبيق كاملاً
- التطبيق يعمل بدون إنترنت — السيرفر والواجهة كلاهما مدمجان داخله
- قاعدة البيانات تُنشأ تلقائياً في مجلد بيانات التطبيق
- بيانات الدخول الافتراضية:
  - مدير: `admin` / `admin123`
  - كاشير: `cashier` / `cashier123`
