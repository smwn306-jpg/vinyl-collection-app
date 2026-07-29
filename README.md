# Crate — ניהול אוסף תקליטים

מדריך הקמה זה מיועד למי ש**אין לו אפשרות להתקין תוכנה על המחשב**. הכל נעשה בדפדפן:
GitHub לאחסון הקוד, StackBlitz להרצה, Firebase Console ל-Auth/DB, ו-Cloudflare Dashboard
ל-Worker ול-Hosting. שום `npm install`, שום CLI, שום התקנה.

## שלב 1: להעלות את הקוד ל-GitHub (בדפדפן)

1. הירשמי ב-[github.com](https://github.com) אם אין לך חשבון
2. **New repository** → תני שם (למשל `vinyl-collection-app`) → **Create repository**
3. בדף הריפו החדש: **uploading an existing file** → גררי לשם את **כל התוכן** מתוך תיקיית
   `vinyl-collection-app` שחילצת מה-zip (כולל התיקייה `worker/`, וכולל `firestore.rules`)
4. **Commit changes**

## שלב 2: להריץ ולראות תצוגה חיה — StackBlitz (בדפדפן, בלי התקנה)

1. גשי לכתובת: `https://stackblitz.com/github/<שם-המשתמש-שלך>/<שם-הריפו>`
   (למשל `stackblitz.com/github/dana/vinyl-collection-app`)
2. StackBlitz יתקין הכל אוטומטית ויפתח תצוגה חיה של האתר, ישירות בדפדפן
3. את יכולה גם לערוך קוד שם ולראות שינויים בזמן אמת — בלי מחשב מקומי בכלל

**שימי לב:** בשלב הזה האתר ירוץ אבל לא יעבוד עדיין (אין עדיין Firebase מחובר) — זה תקין, ממשיכים.

## שלב 3: פרויקט Firebase (הכל בדפדפן, כבר היה כך)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. **Build → Authentication → Get started** → הפעילי **Email/Password**
3. **Build → Firestore Database → Create database** → **Production mode**
4. **Project settings → Your apps → </> (Web)** → **Register app** → תעתיקי את `firebaseConfig`
5. **Build → Firestore Database → Rules** → העתיקי לשם את כל התוכן מהקובץ `firestore.rules`
   מהריפו שלך ב-GitHub → **Publish**

## שלב 4: חשבון Discogs Developer (בדפדפן)

1. הירשמי/התחברי ב-[discogs.com](https://www.discogs.com)
2. [discogs.com/settings/developers](https://www.discogs.com/settings/developers) → **Generate new token**
   או **Create an Application** → שמרי Consumer Key + Consumer Secret

## שלב 5: ה-Worker — דרך עורך הקוד של Cloudflare בדפדפן (לא CLI!)

1. הירשמי/התחברי ב-[dash.cloudflare.com](https://dash.cloudflare.com) (חינמי)
2. **Workers & Pages → Create → Create Worker** → תני שם (למשל `crate-discogs-proxy`) → **Deploy**
   (זה יוצר Worker ריק עם קוד לדוגמה — נחליף אותו עכשיו)
3. **Edit code** (עורך הקוד בדפדפן) → מחקי את כל התוכן שם → פתחי את הקובץ
   `worker/worker-dashboard.js` מהריפו שלך ב-GitHub, העתיקי את כל התוכן, הדביקי בעורך
4. **Save and Deploy**
5. חזרי לדף ה-Worker → **Settings → Variables and Secrets**:
   - הוסיפי `DISCOGS_KEY` (סוג **Secret**) עם ה-Consumer Key משלב 4
   - הוסיפי `DISCOGS_SECRET` (סוג **Secret**) עם ה-Consumer Secret
   - הוסיפי `ALLOWED_ORIGIN` (סוג **Text** רגיל) — בשלב זה אפשר `*`, נצמצם בהמשך
   - **Save and Deploy**
6. בראש דף ה-Worker מופיעה כתובת כמו `https://crate-discogs-proxy.<your-subdomain>.workers.dev`
   — **שמרי אותה**, נצטרך אותה בשלב הבא

## שלב 6: חיבור המשתנים ל-StackBlitz

ב-StackBlitz, בעורך הקבצים: צרי קובץ חדש בשם `.env.local` בשורש הפרויקט, עם:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_DISCOGS_WORKER_URL=https://crate-discogs-proxy.<your-subdomain>.workers.dev
```

(הערכים מ-`firebaseConfig` בשלב 3, והכתובת מ-Worker בשלב 5). שמירת הקובץ תפעיל
רענון אוטומטי בתצוגה החיה — עכשיו הכל אמור לעבוד: הרשמה, הוספת תקליט, חיפוש ב-Discogs.

## שלב 7: פרסום האתר עצמו — Cloudflare Pages (גם בדפדפן, מחובר ל-GitHub)

1. ב-Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. בחרי את הריפו שלך ב-GitHub
3. הגדרות בנייה: **Build command**: `npm run build`, **Build output directory**: `dist`
4. **Environment variables** — הוסיפי שם את אותם משתנים מ-`.env.local` (שלב 6)
5. **Save and Deploy** — Cloudflare בונה את האתר בענן (לא במחשב שלך) ונותן כתובת ציבורית

מעכשיו, כל push ל-GitHub (כולל דרך ממשק העריכה של GitHub עצמו, בדפדפן) יעדכן את האתר החי
אוטומטית.

## מה יש כרגע באפליקציה

- **Firebase Authentication** — הרשמה/כניסה/איפוס סיסמה אמיתיים
- **Firestore** — עמודי אוסף וחוסרים, בזמן אמת, מוגנים ב-`firestore.rules`
- **חיפוש Discogs** אמיתי דרך ה-Worker, עם caching בקצה הרשת

## מה הלאה

1. **סטים/סדרות** — הרחבת ה-Worker עם endpoint למשיכת Master Release מ-Discogs
2. **הודעות בין משתמשים** — ה-collection `messages` כבר מוגדר ב-`firestore.rules`
3. **דשבורד אדמין**
4. **ייבוא אוסף שלם מ-Discogs, מצב אופליין, מהדורות, "מנגן עכשיו", ייצוא CSV**
