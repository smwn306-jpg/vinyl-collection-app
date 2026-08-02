import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import { VinylRecord } from '../types'

// מזהה משותף לפי שם+אמן, כדי שכולם "יפגשו" באותה רשומה בלי קשר ל-ID הפנימי
// השונה של כל אחד. Firestore doc IDs לא יכולים להכיל / אז מנקים תווים בעייתיים.
export function recordKey(title: string, artist: string): string {
  return `${title}::${artist}`
    .trim()
    .toLowerCase()
    .replace(/[/\\#?%[\]]/g, '-')
    .slice(0, 300)
}

// קוראים לפונקציה הזו בכל שינוי כמות/מצב-מכירה של תקליט. אם יש עותק כפול
// וזמין למכירה/החלפה — נכתב לאינדקס המשותף (קריא לכל משתמש חתום, לפי
// firestore.rules). אחרת — נמחק משם, כדי שלא יישאר "רפאים".
export async function syncDuplicateIndex(
  record: VinylRecord,
  ownerId: string,
  ownerName: string
) {
  const key = recordKey(record.title, record.artist)
  const ref = doc(db, 'duplicatesIndex', key, 'holders', ownerId)

  if (record.quantity > 1 && record.tradeType) {
    await setDoc(ref, {
      title: record.title,
      artist: record.artist,
      quantity: record.quantity,
      tradeType: record.tradeType,
      price: record.price || null,
      ownerId,
      ownerName,
    })
  } else {
    await deleteDoc(ref).catch(() => {
      // אין בעיה אם אין מה למחוק (למשל אף פעם לא היה מסומן)
    })
  }
}

export const MARKETPLACES = [
  {
    id: 'discogs',
    label: 'Discogs',
    buildUrl: (q: string) => `https://www.discogs.com/search/?q=${encodeURIComponent(q)}&type=release`,
  },
  {
    id: 'ebay',
    label: 'eBay',
    buildUrl: (q: string) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q + ' vinyl')}`,
  },
  {
    id: 'yad2',
    label: 'יד2',
    buildUrl: (q: string) => `https://www.yad2.co.il/products/collectibles?text=${encodeURIComponent(q)}`,
  },
]
