import { useEffect, useState, FormEvent } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { VinylRecord, Grade } from '../types'
import { searchDiscogs, DiscogsResult } from '../lib/discogs'
import VinylArt from '../components/VinylArt'
import { GRADE_COLORS } from '../lib/grades'
import { useLang } from '../lib/i18n'
import { downloadCsv } from '../lib/csv'

const GRADES: Grade[] = ['M', 'NM', 'VG+', 'VG', 'G', 'F']
const PLACEHOLDER_COLORS = ['#A63D2F', '#1F4B43', '#C9A227', '#2B3A55']

export default function Collection() {
  const { user } = useAuth()
  const { t } = useLang()
  const [records, setRecords] = useState<VinylRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  // מאזין בזמן אמת לאוסף של המשתמש המחובר בלבד.
  // firestore.rules כבר חוסמות גישה לאוספים של אחרים ברמת השרת —
  // השאילתה כאן פשוט לא תחזיר כלום אם ה-path לא שייך למשתמש.
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'collection'), orderBy('title'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRecords(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VinylRecord)
        )
        setLoading(false)
      },
      (err) => {
        console.error('Failed to load collection:', err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [user])

  const changeQuantity = async (id: string, quantity: number) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid, 'collection', id), {
      quantity: Math.max(1, quantity),
    })
  }

  const deleteRecord = async (id: string) => {
    if (!user) return
    if (!confirm('למחוק את התקליט הזה מהאוסף?')) return
    await deleteDoc(doc(db, 'users', user.uid, 'collection', id))
  }

  const exportCsv = () => {
    downloadCsv(
      'crate-collection.csv',
      ['Artist', 'Album', 'Year', 'Genre', 'Catalog Number', 'Discogs ID', 'Condition', 'Quantity'],
      records.map((r) => [r.artist, r.title, r.year || '', r.genre, r.catalogNo, r.discogsId || '', r.grade, r.quantity])
    )
  }

  const playRecord = async (record: VinylRecord) => {
    if (!user) return
    // setDoc עם merge:true כדי לא לדרוס שדות אחרים במסמך הפרופיל (כמו role)
    await setDoc(
      doc(db, 'users', user.uid),
      {
        nowPlaying: {
          recordId: record.id,
          title: record.title,
          artist: record.artist,
          coverColor: record.coverColor,
          startedAt: Date.now(),
        },
      },
      { merge: true }
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-mustard tracking-widest mb-1">
            {t.records(records.length)}
          </p>
          <h2 className="font-display text-4xl">{t.myCollection}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={records.length === 0}
            className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-teal hover:text-teal transition-colors disabled:opacity-30"
          >
            ייצוא CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-mustard hover:text-mustard transition-colors"
          >
            {t.addRecord}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="font-mono text-xs text-paper-light/40 tracking-widest">טוען...</p>
      ) : records.length === 0 ? (
        <p className="font-body text-sm text-paper-light/50">
          האוסף שלך ריק עדיין. לחצי על "+ הוסף תקליט" כדי להתחיל.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onChangeQuantity={changeQuantity}
              onDelete={deleteRecord}
              onPlay={playRecord}
            />
          ))}
        </div>
      )}

      {showAdd && user && (
        <AddRecordModal
          userId={user.uid}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function RecordCard({
  record,
  onChangeQuantity,
  onDelete,
  onPlay,
}: {
  record: VinylRecord
  onChangeQuantity: (id: string, quantity: number) => void
  onDelete: (id: string) => void
  onPlay: (record: VinylRecord) => void
}) {
  return (
    <div className="rounded-sm overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-all duration-200 bg-paper text-ink">
      <VinylArt color={record.coverColor} />
      <div className="p-4">
        <p className="font-mono text-[10px] tracking-widest text-ink/50 mb-1">
          {record.catalogNo} · {record.year}
        </p>
        <h3 className="font-display text-lg leading-tight uppercase">{record.title}</h3>
        <p className="font-body text-sm text-ink/70 mt-0.5">{record.artist}</p>

        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase px-2 py-1 rounded bg-teal/20 text-teal">
            {record.genre}
          </span>
          <span
            className="font-mono text-[10px] px-2 py-1 rounded"
            style={{
              background: `${GRADE_COLORS[record.grade]}22`,
              color: GRADE_COLORS[record.grade],
            }}
          >
            {record.grade}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 border border-ink/20 rounded overflow-hidden">
            <button
              onClick={() => onChangeQuantity(record.id, record.quantity - 1)}
              className="w-6 h-6 text-sm hover:bg-black/5"
            >
              −
            </button>
            <span className="font-mono text-xs w-5 text-center">{record.quantity}</span>
            <button
              onClick={() => onChangeQuantity(record.id, record.quantity + 1)}
              className="w-6 h-6 text-sm hover:bg-black/5"
            >
              +
            </button>
          </div>
          <button
            onClick={() => onPlay(record)}
            title="סמן כמנגן עכשיו"
            className="w-6 h-6 flex items-center justify-center text-mustard hover:scale-110 transition-transform"
          >
            ▶
          </button>
          <button
            onClick={() => onDelete(record.id)}
            className="font-mono text-[10px] uppercase text-rust hover:underline"
          >
            מחיקה
          </button>
        </div>
      </div>
    </div>
  )
}

function AddRecordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [year, setYear] = useState('')
  const [genre, setGenre] = useState('')
  const [grade, setGrade] = useState<Grade>('NM')
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const [discogsId, setDiscogsId] = useState<number | null>(null)
  const [masterId, setMasterId] = useState<number | null>(null)
  const [thumb, setThumb] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DiscogsResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const results = await searchDiscogs(searchQuery.trim())
      setSearchResults(results)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'החיפוש נכשל')
    } finally {
      setSearching(false)
    }
  }

  const pickResult = (r: DiscogsResult) => {
    setTitle(r.title)
    setArtist(r.artist)
    setYear(r.year ? String(r.year) : '')
    setGenre(r.genre || '')
    setDiscogsId(r.discogsId)
    setMasterId(r.masterId)
    setThumb(r.thumb)
    setSearchResults([])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !artist.trim()) return
    setSaving(true)
    try {
      // ownerId נשמר גם כאן וגם ננעל ב-firestore.rules — לא ניתן להזין ownerId
      // שונה מ-uid המשתמש המחובר, ה-rules יחסמו את זה בשרת.
      await addDoc(collection(db, 'users', userId, 'collection'), {
        discogsId: discogsId || null,
        masterId: masterId || null,
        title: title.trim(),
        artist: artist.trim(),
        year: year ? parseInt(year, 10) : 0,
        genre: genre.trim() || 'לא ידוע',
        catalogNo: 'MANUAL-' + Math.floor(Math.random() * 9000 + 1000),
        coverColor: PLACEHOLDER_COLORS[Math.floor(Math.random() * PLACEHOLDER_COLORS.length)],
        thumb: thumb || null,
        quantity,
        grade,
        tradeType: null,
        ownerId: userId,
        createdAt: serverTimestamp(),
      })
      onClose()
    } catch (err) {
      console.error('Failed to add record:', err)
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
        className="w-full max-w-md bg-paper text-ink rounded-sm p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl mb-4">הוספת תקליט</h3>

        <div className="mb-4 pb-4 border-b border-ink/10">
          <p className="font-mono text-[10px] tracking-widest uppercase opacity-60 mb-2">
            חיפוש ב-Discogs (אופציונלי)
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 mb-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="שם אלבום או אמן..."
              className="flex-1 border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
            />
            <button
              type="submit"
              disabled={searching}
              className="font-mono text-xs uppercase px-4 rounded bg-ink text-paper disabled:opacity-50"
            >
              {searching ? '...' : 'חפש'}
            </button>
          </form>

          {searchError && <p className="text-xs text-rust mb-2">{searchError}</p>}

          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.discogsId}
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full flex items-center gap-2 text-right rounded px-2 py-1.5 text-sm hover:bg-black/5 transition-colors"
                >
                  {r.thumb ? (
                    <img src={r.thumb} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-ink/10 shrink-0" />
                  )}
                  <div className="leading-tight flex-1 min-w-0">
                    <p className="font-medium truncate">{r.title || '—'}</p>
                    <p className="text-[11px] opacity-50 truncate">
                      {r.artist} {r.year ? `· ${r.year}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="font-mono text-[10px] tracking-widest uppercase opacity-40 text-center mb-3">
          — או מילוי ידני —
        </p>

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
          <div className="grid grid-cols-2 gap-3">
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as Grade)}
              className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-ink text-paper font-mono text-xs tracking-widest uppercase rounded py-2.5 disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'הוסף לאוסף'}
          </button>
        </form>
      </div>
    </div>
  )
}
