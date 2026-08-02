import { useEffect, useState, FormEvent } from 'react'
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { WantListItem } from '../types'
import { recordKey, MARKETPLACES } from '../lib/duplicatesIndex'

interface Holder {
  ownerId: string
  ownerName: string
  quantity: number
  tradeType: 'sell' | 'trade'
  price: number | null
}

export default function GhostSleeveCard({
  item,
  onAcquire,
  onRemove,
}: {
  item: WantListItem
  onAcquire: (item: WantListItem) => void
  onRemove: (id: string) => void
}) {
  const { user } = useAuth()
  const [holders, setHolders] = useState<Holder[]>([])
  const [messagingHolder, setMessagingHolder] = useState<Holder | null>(null)

  // מאזין בזמן אמת לאינדקס המשותף — אם מישהו מסמן "יש לי כפול" על אותו
  // תקליט בדיוק, זה מופיע כאן מיידית, בלי לרענן.
  useEffect(() => {
    const key = recordKey(item.title, item.artist)
    const unsubscribe = onSnapshot(collection(db, 'duplicatesIndex', key, 'holders'), (snap) => {
      const list = snap.docs
        .map((d) => d.data() as Holder)
        .filter((h) => h.ownerId !== user?.uid) // לא מציגים "התאמה" עם עצמך
      setHolders(list)
    })
    return unsubscribe
  }, [item.title, item.artist, user?.uid])

  return (
    <div className="group relative">
      <div
        className="absolute top-2 bottom-2 right-2 aspect-square rounded-full border border-dashed border-paper-light/30 transition-transform duration-300 ease-out group-hover:translate-x-6"
        style={{ opacity: 0.35 }}
      />

      <div className="relative rounded-sm border border-dashed border-paper-light/30 bg-transparent p-4 pr-10 flex flex-col justify-between transition-transform duration-300 ease-out group-hover:-translate-x-1">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-paper-light/40 mb-1">
            {item.catalogNo}
          </p>
          <h3 className="font-display text-xl leading-tight uppercase text-paper-light/80">
            {item.title}
          </h3>
          <p className="font-body text-sm text-paper-light/50 mt-1">{item.artist}</p>
        </div>

        {holders.length > 0 && (
          <div className="mt-3 rounded-sm p-2.5 space-y-2" style={{ background: 'rgba(32,85,75,0.15)', border: '1px solid rgba(32,85,75,0.4)' }}>
            <p className="font-mono text-[10px] tracking-widest text-teal uppercase">
              {holders.length} אספנים עם עותק זמין
            </p>
            {holders.map((h) => (
              <div key={h.ownerId} className="flex items-center justify-between gap-2">
                <p className="text-xs font-body">
                  <span className="font-medium">{h.ownerName}</span>{' '}
                  <span className="text-paper-light/50">
                    — {h.tradeType === 'sell' ? `למכירה${h.price ? ` (₪${h.price})` : ''}` : 'להחלפה'}
                  </span>
                </p>
                <button
                  onClick={() => setMessagingHolder(h)}
                  className="font-mono text-[10px] uppercase text-mustard hover:underline shrink-0"
                >
                  הודעה
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 mt-3">
          <div className="grid grid-cols-3 gap-1.5">
            {MARKETPLACES.map((m) => (
              <a
                key={m.id}
                href={m.buildUrl(`${item.title} ${item.artist}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center font-mono text-[10px] tracking-wider uppercase text-mustard border border-mustard/40 rounded-sm py-1.5 hover:bg-mustard hover:text-ink transition-colors"
              >
                {m.label}
              </a>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAcquire(item)}
              className="text-center font-mono text-[10px] tracking-wider uppercase rounded-sm py-1.5 bg-mustard/20 text-mustard hover:bg-mustard/30 transition-colors"
            >
              יש לי כבר
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className="text-center font-mono text-[10px] tracking-wider uppercase rounded-sm py-1.5 border border-paper-light/20 text-paper-light/50 hover:text-paper-light hover:border-paper-light/40 transition-colors"
            >
              הסרה
            </button>
          </div>
        </div>
      </div>

      {messagingHolder && user && (
        <MessageHolderModal
          holder={messagingHolder}
          item={item}
          senderId={user.uid}
          onClose={() => setMessagingHolder(null)}
        />
      )}
    </div>
  )
}

function MessageHolderModal({
  holder,
  item,
  senderId,
  onClose,
}: {
  holder: Holder
  item: WantListItem
  senderId: string
  onClose: () => void
}) {
  const [text, setText] = useState(
    `היי! ראיתי שיש לך יותר מעותק אחד של ${item.title} (${item.artist}). במקרה תשקול למכור/להחליף את הכפול?`
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await addDoc(collection(db, 'messages'), {
        senderId,
        receiverId: holder.ownerId,
        message: text.trim(),
        relatedRecordId: item.id,
        read: false,
        createdAt: serverTimestamp(),
      })
      setSent(true)
    } finally {
      setSending(false)
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
        {sent ? (
          <div className="text-center py-4">
            <p className="text-teal text-sm mb-4">✓ ההודעה נשלחה ל{holder.ownerName}</p>
            <p className="text-xs text-ink/50 mb-4">
              האפליקציה רק מעבירה את ההודעה — התיאום, התשלום והמשלוח מתבצעים ישירות ביניכם.
            </p>
            <button
              onClick={onClose}
              className="font-mono text-xs uppercase bg-ink text-paper rounded px-4 py-2"
            >
              סגירה
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <h3 className="font-display text-2xl mb-1">הודעה ל{holder.ownerName}</h3>
            <p className="text-xs text-ink/50 mb-4">בנוגע ל-{item.title}</p>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard resize-none"
            />
            <p className="text-[11px] text-ink/40 mt-2 mb-4">
              האפליקציה רק מעבירה הודעה — היא לא מטפלת בתשלום או במשלוח.
            </p>
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-ink text-paper font-mono text-xs tracking-widest uppercase rounded py-2.5 disabled:opacity-50"
            >
              {sending ? 'שולח...' : 'שליחה'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
