export type Grade = 'M' | 'NM' | 'VG+' | 'VG' | 'G' | 'F'
export type TradeType = 'sell' | 'trade' | null

export interface VinylRecord {
  id: string
  discogsId?: string | number // מזהה Master Release ב-Discogs, לשימוש עתידי בהשוואה מדויקת
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

export interface Message {
  id: string
  from: string // uid — נקבע תמיד מ-request.auth בשרת, לא מהלקוח
  to: string // uid
  recordTitle?: string | null
  text: string
  createdAt: number
  read: boolean
}

export interface UserProfile {
  id: string // == uid
  displayName: string
  email: string
  role: 'user' | 'admin'
}
