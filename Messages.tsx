import { useEffect, useState, FormEvent } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { Message } from '../types'

export default function Messages() {
  const { user } = useAuth()
  const [inbox, setInbox] = useState<Message[]>([])
  const [outbox, setOutbox] = useState<Message[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'inbox' | 'outbox'>('inbox')
  const [showCompose, setShowCompose] = useState(false)

  useEffect(() => {
    if (!user) return
    const inboxQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const outboxQuery = query(
      collection(db, 'messages'),
      where('senderId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsubInbox = onSnapshot(inboxQuery, (snap) => {
      setInbox(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message))
    })
    const unsubOutbox = onSnapshot(outboxQuery, (snap) => {
      setOutbox(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message))
    })
    return () => {
      unsubInbox()
      unsubOutbox()
    }
  }, [user])

  // שולפת שמות תצוגה למשתמשים שמופיעים בהודעות, כדי לא להציג uid גולמי
  useEffect(() => {
    const ids = new Set([...inbox.map((m) => m.senderId), ...outbox.map((m) => m.receiverId)])
    ids.forEach(async (uid) => {
      if (names[uid] || !uid) return
      const snap = await getDoc(doc(db, 'users', uid))
      if (snap.exists()) {
        setNames((prev) => ({ ...prev, [uid]: snap.data().displayName || snap.data().email || uid }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox, outbox])

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'messages', id), { read: true })
  }

  const deleteMessage = async (id: string) => {
    await deleteDoc(doc(db, 'messages', id))
  }

  const list = tab === 'inbox' ? inbox : outbox
  const unreadCount = inbox.filter((m) => !m.read).length

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-teal tracking-widest mb-1">
            {unreadCount > 0 ? `${unreadCount} הודעות שלא נקראו` : 'הודעות'}
          </p>
          <h2 className="font-display text-4xl">תיבת ההודעות</h2>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-mustard hover:text-mustard transition-colors"
        >
          + הודעה חדשה
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-paper-light/10">
        <button
          onClick={() => setTab('inbox')}
          className={`font-mono text-xs tracking-widest uppercase px-4 py-2 border-b-2 transition-colors ${
            tab === 'inbox' ? 'border-mustard text-mustard' : 'border-transparent text-paper-light/50'
          }`}
        >
          נכנסות {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button
          onClick={() => setTab('outbox')}
          className={`font-mono text-xs tracking-widest uppercase px-4 py-2 border-b-2 transition-colors ${
            tab === 'outbox' ? 'border-mustard text-mustard' : 'border-transparent text-paper-light/50'
          }`}
        >
          יוצאות
        </button>
      </div>

      {list.length === 0 ? (
        <p className="font-body text-sm text-paper-light/50">אין כאן הודעות עדיין.</p>
      ) : (
        <div className="space-y-2">
          {list.map((m) => {
            const otherUid = tab === 'inbox' ? m.senderId : m.receiverId
            const isUnread = tab === 'inbox' && !m.read
            return (
              <div
                key={m.id}
                onClick={() => isUnread && markRead(m.id)}
                className={`rounded-sm p-4 border transition-colors ${
                  isUnread
                    ? 'border-mustard/40 bg-mustard/5 cursor-pointer'
                    : 'border-paper-light/10 bg-paper-light/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-mono text-[11px] tracking-widest text-paper-light/50">
                    {tab === 'inbox' ? 'מאת: ' : 'אל: '}
                    <span className="text-paper-light">{names[otherUid] || '...'}</span>
                    {isUnread && <span className="text-mustard ms-2">● חדש</span>}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMessage(m.id)
                    }}
                    className="font-mono text-[10px] uppercase text-rust hover:underline"
                  >
                    מחיקה
                  </button>
                </div>
                <p className="font-body text-sm">{m.message}</p>
              </div>
            )
          })}
        </div>
      )}

      {showCompose && user && <ComposeModal senderId={user.uid} onClose={() => setShowCompose(false)} />}
    </div>
  )
}

function ComposeModal({ senderId, onClose }: { senderId: string; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !message.trim()) return
    setSending(true)
    try {
      // מחפשים את המשתמש לפי אימייל כדי לקבל את ה-uid שלו (receiverId)
      const q = query(collection(db, 'users'), where('email', '==', email.trim()))
      const snap = await getDocs(q)
      if (snap.empty) {
        setError('לא נמצא משתמש עם האימייל הזה')
        setSending(false)
        return
      }
      const receiverId = snap.docs[0].id
      if (receiverId === senderId) {
        setError('אי אפשר לשלוח הודעה לעצמך')
        setSending(false)
        return
      }

      await addDoc(collection(db, 'messages'), {
        senderId,
        receiverId,
        message: message.trim(),
        relatedRecordId: null,
        createdAt: serverTimestamp(),
        read: false,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה')
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
        <h3 className="font-display text-2xl mb-4">הודעה חדשה</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל הנמען"
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
          />
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="ההודעה שלך..."
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard resize-none"
          />
          {error && <p className="text-sm text-rust">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-ink text-paper font-mono text-xs tracking-widest uppercase rounded py-2.5 disabled:opacity-50"
          >
            {sending ? 'שולחת...' : 'שליחה'}
          </button>
        </form>
      </div>
    </div>
  )
}
