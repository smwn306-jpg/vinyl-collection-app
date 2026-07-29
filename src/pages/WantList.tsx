import { useEffect, useState, FormEvent } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { WantListItem } from '../types'
import GhostSleeveCard from '../components/GhostSleeveCard'
import { useLang } from '../lib/i18n'

const PLACEHOLDER_COLORS = ['#A63D2F', '#1F4B43', '#C9A227', '#2B3A55']

export default function WantList() {
  const { user } = useAuth()
  const { t } = useLang()
  const [items, setItems] = useState<WantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'wantlist'), orderBy('title'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as WantListItem))
        setLoading(false)
      },
      (err) => {
        console.error('Failed to load want list:', err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [user])

  const removeItem = async (id: string) => {
    if (!user) return
    await deleteDoc(doc(db, 'users', user.uid, 'wantlist', id))
  }

  // "יש לי כבר": מוסיפים לאוסף ומסירים מהחוסרים באותה פעולה אטומית —
  // כך שאין רגע-ביניים שבו הפריט מופיע גם וגם, גם אם החיבור נופל באמצע.
  const acquireItem = async (item: WantListItem) => {
    if (!user) return
    const batch = writeBatch(db)
    const newRecordRef = doc(collection(db, 'users', user.uid, 'collection'))
    batch.set(newRecordRef, {
      title: item.title,
      artist: item.artist,
      year: item.year,
      genre: item.genre,
      catalogNo: item.catalogNo,
      coverColor: item.coverColor,
      quantity: 1,
      grade: 'NM',
      tradeType: null,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    })
    batch.delete(doc(db, 'users', user.uid, 'wantlist', item.id))
    await batch.commit()
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-rust tracking-widest mb-1">{t.missing(items.length)}</p>
          <h2 className="font-display text-4xl">{t.completeCollection}</h2>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-mustard hover:text-mustard transition-colors"
        >
          {t.addToWantlist}
        </button>
      </div>

      <p className="font-body text-sm text-paper-light/50 mb-8 max-w-xl">
        אלה התקליטים החסרים לך. בהמשך, המחירים וכמות המוכרים יישלפו אוטומטית מ-Discogs
        Marketplace דרך Cloudflare Worker — כרגע השדות האלה מוזנים ידנית.
      </p>

      {loading ? (
        <p className="font-mono text-xs text-paper-light/40 tracking-widest">טוען...</p>
      ) : items.length === 0 ? (
        <p className="font-body text-sm text-paper-light/50">
          אין לך כרגע פריטים ברשימת החוסרים.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <GhostSleeveCard key={item.id} item={item} onAcquire={acquireItem} onRemove={removeItem} />
          ))}
        </div>
      )}

      {showAdd && user && <AddWantModal userId={user.uid} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function AddWantModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [year, setYear] = useState('')
  const [genre, setGenre] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !artist.trim()) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'users', userId, 'wantlist'), {
        title: title.trim(),
        artist: artist.trim(),
        year: year ? parseInt(year, 10) : 0,
        genre: genre.trim() || 'לא ידוע',
        catalogNo: '—',
        coverColor: PLACEHOLDER_COLORS[Math.floor(Math.random() * PLACEHOLDER_COLORS.length)],
        lowestPrice: 0,
        currency: '₪',
        listingCount: 0,
        source: 'Discogs Marketplace',
        ownerId: userId,
        createdAt: serverTimestamp(),
      })
      onClose()
    } catch (err) {
      console.error('Failed to add want list item:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-paper text-ink rounded-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl mb-4">הוספה לרשימת חוסרים</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="שם האלבום"
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
          />
          <input
            required
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="אמן"
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="שנה"
              className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
            />
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="ז'אנר"
              className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-ink text-paper font-mono text-xs tracking-widest uppercase rounded py-2.5 disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'הוסף לרשימה'}
          </button>
        </form>
      </div>
    </div>
  )
}
