export type Grade = 'M' | 'NM' | 'VG+' | 'VG' | 'G' | 'F'
export type TradeType = 'sell' | 'trade' | null

export interface VinylRecord {
  id: string
  discogsId?: string | number // מזהה Release ב-Discogs
  masterId?: string | number | null // מזהה Master Release — לצורך שליפת מהדורות/גרסאות
  thumb?: string | null // תמונה ממוזערת מ-Discogs, אם קיימת
  title: string
  artist: string
  year: number
  genre: string
  catalogNo: string
  coverColor: string // placeholder color for the sleeve art until real covers are wired in
  quantity: number
  grade: Grade
  tradeType: TradeType
  price?: number // רלוונטי רק אם tradeType === 'sell'
  ownerId: string // request.auth.uid של הבעלים — לעולם לא משתנה מהלקוח
  edition?: {
    releaseId: number
    country: string | null
    label: string | null
    format: string | null
    released: string | null // תאריך/שנת הוצאה של המהדורה הספציפית הזו
  }
}

export interface WantListItem {
  id: string
  title: string
  artist: string
  year: number
  genre: string
  catalogNo: string
  coverColor: string
  lowestPrice: number
  currency: string
  listingCount: number
  source: 'Discogs Marketplace' | 'MusicBrainz'
  ownerId: string
}

export interface RecordSet {
  id: string
  discogsArtistId?: string
  name: string
  description: string
  items: { title: string; artist: string }[]
}

import { Timestamp } from 'firebase/firestore'

export interface Message {
  id: string
  senderId: string // נקבע תמיד מ-request.auth בשרת, לא מהלקוח
  receiverId: string
  message: string
  relatedRecordId?: string | null
  createdAt: Timestamp | null // null רגע לפני שהשרת ממלא את ה-serverTimestamp
  read: boolean
}

export interface NowPlaying {
  recordId: string
  title: string
  artist: string
  coverColor: string
  startedAt: number
}

export interface UserProfile {
  id: string // == uid
  displayName: string
  email: string
  role: 'user' | 'admin'
  blocked?: boolean
  createdAt?: Timestamp | null
  lastActiveAt?: Timestamp | null
}

export interface SupportMessage {
  id: string
  userId: string
  userEmail: string
  message: string
  status: 'open' | 'resolved'
  createdAt: Timestamp | null
}

export interface Suggestion {
  id: string
  authorId: string
  authorName: string
  title: string
  description: string
  createdAt: Timestamp | null
}
