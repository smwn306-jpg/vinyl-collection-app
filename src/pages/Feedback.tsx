import { useEffect, useState, FormEvent } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { Suggestion } from '../types'

export default function Feedback() {
  const { user } = useAuth()
  const [supportText, setSupportText] = useState('')
  const [supportSaving, setSupportSaving] = useState(false)
  const [supportSent, setSupportSent] = useState(false)

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showNewSuggestion, setShowNewSuggestion] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snap) => {
      setSuggestions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Suggestion))
    })
    return unsubscribe
  }, [])

  if (!user) return null

  const handleSupportSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supportText.trim()) return
    setSupportSaving(true)
    try {
      await addDoc(collection(db, 'supportMessages'), {
        userId: user.uid,
        userEmail: user.email,
        message: supportText.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      })
      setSupportText('')
      setSupportSent(true)
      setTimeout(() => setSupportSent(false), 4000)
    } finally {
      setSupportSaving(false)
    }
  }

  const addSuggestion = async (title: string, description: string) => {
    await addDoc(collection(db, 'suggestions'), {
      authorId: user.uid,
      authorName: user.displayName || user.email,
      title: title.trim(),
      description: description.trim(),
      createdAt: serverTimestamp(),
    })
  }

  const deleteSuggestion = async (id: string) => {
    await deleteDoc(doc(db, 'suggestions', id))
  }

  return (
    <div>
      <p className="font-mono text-xs text-teal tracking-widest mb-1">עזרה ורעיונות</p>
      <h2 className="font-display text-4xl mb-8">תמיכה והצעות</h2>

      <div className="mb-12 pb-12 border-b border-paper-light/10 max-w-md">
        <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase mb-2">
          פנייה לתמיכה
        </p>
        <form onSubmit={handleSupportSubmit} className="space-y-3">
          <textarea
            required
            rows={4}
            value={supportText}
            onChange={(e) => setSupportText(e.target.value)}
            placeholder="נתקלת בבעיה? ספרי לנו..."
            className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none resize-none"
          />
          {supportSent && <p className="text-sm text-teal">✓ הפנייה נשלחה, נחזור אלייך</p>}
          <button
            type="submit"
            disabled={supportSaving}
            className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-mustard hover:text-mustard transition-colors disabled:opacity-50"
          >
            {supportSaving ? 'שולחת...' : 'שליחה'}
          </button>
        </form>
      </div>

      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase mb-1">
            {suggestions.length} רעיונות
          </p>
          <h3 className="font-display text-2xl">מה תרצו לראות באפליקציה?</h3>
        </div>
        <button
          onClick={() => setShowNewSuggestion(true)}
          className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-mustard hover:text-mustard transition-colors"
        >
          + הצעה חדשה
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.length === 0 ? (
          <p className="font-body text-sm text-paper-light/50">אין עדיין הצעות — תהיי הראשונה!</p>
        ) : (
          suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              currentUserId={user.uid}
              onDelete={() => deleteSuggestion(s.id)}
            />
          ))
        )}
      </div>

      {showNewSuggestion && (
        <NewSuggestionModal
          onClose={() => setShowNewSuggestion(false)}
          onSubmit={addSuggestion}
        />
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  currentUserId,
  onDelete,
}: {
  suggestion: Suggestion
  currentUserId: string
  onDelete: () => void
}) {
  const [voteCount, setVoteCount] = useState(0)
  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'suggestions', suggestion.id, 'votes'), (snap) => {
      setVoteCount(snap.size)
      setHasVoted(snap.docs.some((d) => d.id === currentUserId))
    })
    return unsubscribe
  }, [suggestion.id, currentUserId])

  const toggleVote = async () => {
    const voteRef = doc(db, 'suggestions', suggestion.id, 'votes', currentUserId)
    if (hasVoted) {
      await deleteDoc(voteRef)
    } else {
      await setDoc(voteRef, { votedAt: serverTimestamp() })
    }
  }

  return (
    <div className="rounded-sm border border-paper-light/10 p-4 flex items-start gap-4">
      <button
        onClick={toggleVote}
        className="flex flex-col items-center shrink-0 rounded-sm px-3 py-2 transition-colors"
        style={
          hasVoted
            ? { background: 'rgba(201,162,39,0.2)', color: '#C9A227' }
            : { border: '1px solid rgba(241,234,217,0.2)' }
        }
      >
        <span className="text-sm">▲</span>
        <span className="font-mono text-xs">{voteCount}</span>
      </button>
      <div className="min-w-0 flex-1">
        <h4 className="font-body font-medium">{suggestion.title}</h4>
        {suggestion.description && (
          <p className="font-body text-sm text-paper-light/60 mt-1">{suggestion.description}</p>
        )}
        <p className="font-mono text-[10px] text-paper-light/40 mt-2">{suggestion.authorName}</p>
      </div>
      {suggestion.authorId === currentUserId && (
        <button
          onClick={onDelete}
          className="font-mono text-[10px] uppercase text-rust hover:underline shrink-0"
        >
          מחיקה
        </button>
      )}
    </div>
  )
}

function NewSuggestionModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (title: string, description: string) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSubmit(title, description)
      onClose()
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
        <h3 className="font-display text-2xl mb-4">הצעה חדשה</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="כותרת קצרה"
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard"
          />
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="פרטים נוספים (אופציונלי)"
            className="w-full border border-ink/15 rounded px-3 py-2 text-sm bg-white/50 outline-none focus:border-mustard resize-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-ink text-paper font-mono text-xs tracking-widest uppercase rounded py-2.5 disabled:opacity-50"
          >
            {saving ? 'שולחת...' : 'פרסום הרעיון'}
          </button>
        </form>
      </div>
    </div>
  )
}
