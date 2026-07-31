import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

// כל הערכים האלה מגיעים מקובץ .env.local (ראי .env.example).
// חשוב: המפתחות האלה גלויים ללקוח בכל מקרה (זה נורמלי ב-Firebase client SDK) —
// ההגנה האמיתית היא ב-firestore.rules, לא בהסתרת המפתחות האלה.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// persistentLocalCache שומר את כל מה שנקרא מ-Firestore ב-IndexedDB המקומי.
// זה נותן בפועל:
//  - צפייה באוסף גם ללא אינטרנט (מוצג מהמטמון המקומי)
//  - הוספה/עריכה בזמן אופליין — הכתיבה נכנסת לתור מקומי ומסתנכרנת אוטומטית
//    ברגע שהחיבור חוזר, בלי קוד נוסף שצריך לכתוב
//  - persistentMultipleTabManager כדי שזה יעבוד נכון גם אם האתר פתוח בכמה
//    טאבים בו-זמנית באותו דפדפן
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
