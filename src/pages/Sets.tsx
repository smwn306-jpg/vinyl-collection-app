import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { VinylRecord } from '../types'
import { getMasterVersions, DiscogsMaster } from '../lib/discogs'
import VinylArt from '../components/VinylArt'

export default function Sets() {
  const { user } = useAuth()
  const [records, setRecords] = useState<VinylRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [openRecord, setOpenRecord] = useState<VinylRecord | null>(null)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'users', user.uid, 'collection'), orderBy('title'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VinylRecord))
      setLoading(false)
    })
    return unsubscribe
  }, [user])

  const withMaster = records.filter((r) => r.masterId)
  const withoutMaster = records.filter((r) => !r.masterId)

  const setEdition = async (record: VinylRecord, version: DiscogsMaster['versions'][number]) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid, 'collection', record.id), {
      edition: {
        releaseId: version.releaseId,
        country: version.country,
        label: version.label,
        format: version.format,
        released: version.released,
      },
    })
  }

  const addVersionToWantlist = async (
    record: VinylRecord,
    version: DiscogsMaster['versions'][number]
  ) => {
    if (!user) return
    await addDoc(collection(db, 'users', user.uid, 'wantlist'), {
      title: record.title,
      artist: record.artist,
      year: version.released ? parseInt(version.released, 10) || 0 : 0,
      genre: record.genre,
      catalogNo: version.catalogNo || '—',
      coverColor: record.coverColor,
      lowestPrice: 0,
      currency: '₪',
      listingCount: 0,
      source: 'Discogs Marketplace',
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    })
  }

  return (
    <div>
      <p className="font-mono text-xs text-teal tracking-widest mb-1">סטים וסדרות</p>
      <h2 className="font-display text-4xl mb-2">מהדורות וגרסאות</h2>
      <p className="font-body text-sm text-paper-light/50 mb-8 max-w-xl">
        לכל תקליט שנוסף דרך חיפוש Discogs יש קישור למהדורה הראשית שלו (Master Release). לחצי
        על תקליט כדי לראות אילו גרסאות/הדפסות אחרות קיימות, ולסמן איזו מהן היא בדיוק זו
        שברשותך.
      </p>

      {loading ? (
        <p className="font-mono text-xs text-paper-light/40 tracking-widest">טוען...</p>
      ) : withMaster.length === 0 ? (
        <p className="font-body text-sm text-paper-light/50">
          עדיין אין באוסף שלך תקליטים שנוספו דרך חיפוש Discogs. תקליט שמוזן ידנית לא מקושר
          למהדורה, ולכן אי אפשר להציג לו גרסאות. נסי להוסיף תקליט חדש דרך שדה החיפוש בעמוד
          "אוסף".
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {withMaster.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenRecord(r)}
              className="text-right rounded-sm overflow-hidden bg-paper text-ink hover:-translate-y-1 transition-transform duration-200 shadow-lg"
            >
              <VinylArt color={r.coverColor} />
              <div className="p-3">
                <h3 className="font-display text-base leading-tight uppercase">{r.title}</h3>
                <p className="font-body text-xs text-ink/70 mt-0.5">{r.artist}</p>
                {r.edition && (
                  <p className="font-mono text-[10px] text-teal mt-1">
                    {r.edition.country || '—'} {r.edition.released ? `· ${r.edition.released}` : ''}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {withoutMaster.length > 0 && (
        <p className="font-mono text-[11px] text-paper-light/30 mt-8">
          {withoutMaster.length} תקליטים נוספים באוסף שלך הוזנו ידנית, בלי Master Release.
        </p>
      )}

      {openRecord && (
        <VersionsModal
          record={openRecord}
          onClose={() => setOpenRecord(null)}
          onSelectEdition={setEdition}
          onAddToWantlist={addVersionToWantlist}
        />
      )}
    </div>
  )
}

function VersionsModal({
  record,
  onClose,
  onSelectEdition,
  onAddToWantlist,
}: {
  record: VinylRecord
  onClose: () => void
  onSelectEdition: (record: VinylRecord, version: DiscogsMaster['versions'][number]) => void
  onAddToWantlist: (record: VinylRecord, version: DiscogsMaster['versions'][number]) => Promise<void>
}) {
  const [master, setMaster] = useState<DiscogsMaster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedReleaseId, setSavedReleaseId] = useState<number | null>(record.edition?.releaseId || null)
  const [addedReleaseIds, setAddedReleaseIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!record.masterId) return
    setLoading(true)
    setError(null)
    getMasterVersions(record.masterId)
      .then(setMaster)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בשליפת מהדורות'))
      .finally(() => setLoading(false))
  }, [record.masterId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-paper text-ink rounded-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-ink/50">Master Release</p>
            <h3 className="font-display text-2xl leading-tight">{record.title}</h3>
            <p className="font-body text-sm text-ink/70">{record.artist}</p>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink text-xl leading-none">
            ✕
          </button>
        </div>

        {loading && <p className="font-mono text-xs text-ink/50">טוענת מהדורות...</p>}
        {error && <p className="font-body text-sm text-rust">{error}</p>}

        {master && (
          <>
            <p className="font-mono text-xs text-teal mb-3">{master.versionCount} מהדורות ידועות</p>
            <div className="space-y-2">
              {master.versions.map((v) => {
                const isSaved = savedReleaseId === v.releaseId
                return (
                  <div
                    key={v.releaseId}
                    className="flex items-center gap-3 border rounded p-2"
                    style={{ borderColor: isSaved ? '#C9A227' : 'rgba(21,24,28,0.1)' }}
                  >
                    {v.thumb ? (
                      <img src={v.thumb} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-ink/10 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-[11px] text-ink/50 truncate">
                        {v.country || '—'}
                        {v.released ? ` · ${v.released}` : ''}
                        {v.format ? ` · ${v.format}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onSelectEdition(record, v)
                        setSavedReleaseId(v.releaseId)
                      }}
                      className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded shrink-0 transition-colors"
                      style={
                        isSaved
                          ? { background: '#C9A227', color: '#15181C' }
                          : { border: '1px solid rgba(21,24,28,0.2)' }
                      }
                    >
                      {isSaved ? '✓ שלי' : 'זו שלי'}
                    </button>
                    {!isSaved && (
                      <button
                        onClick={async () => {
                          await onAddToWantlist(record, v)
                          setAddedReleaseIds((prev) => new Set(prev).add(v.releaseId))
                        }}
                        disabled={addedReleaseIds.has(v.releaseId)}
                        className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1.5 rounded shrink-0 transition-colors disabled:opacity-40"
                        style={{ border: '1px solid rgba(176,67,47,0.5)', color: '#B0432F' }}
                      >
                        {addedReleaseIds.has(v.releaseId) ? '✓ נוסף' : '+ לחוסרים'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
