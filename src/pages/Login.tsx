import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  AuthError,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

// מיפוי בסיסי של קודי שגיאה של Firebase להודעות קריאות בעברית.
// לא חושפים לעולם את הפרטים המדויקים (כמו "user-not-found" מול "wrong-password")
// כדי לא לתת לתוקף פוטנציאלי מידע על אילו כתובות מייל רשומות במערכת.
function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'כתובת האימייל לא תקינה'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'אימייל או סיסמה שגויים'
    case 'auth/too-many-requests':
      return 'יותר מדי ניסיונות. נסי שוב בעוד כמה דקות'
    default:
      return 'משהו השתבש. נסי שוב'
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [showForgot, setShowForgot] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const profileSnap = await getDoc(doc(db, 'users', credential.user.uid))
      if (profileSnap.exists() && profileSnap.data().blocked) {
        await signOut(auth)
        setError('החשבון הזה נחסם. פני לתמיכה אם זו טעות.')
        return
      }
      await setDoc(doc(db, 'users', credential.user.uid), { lastActiveAt: serverTimestamp() }, { merge: true })
      navigate('/')
    } catch (err) {
      setError(friendlyAuthError(err as AuthError))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err) {
      setError(friendlyAuthError(err as AuthError))
    } finally {
      setLoading(false)
    }
  }

  if (showForgot) {
    return (
      <div className="max-w-sm mx-auto">
        <p className="font-mono text-xs text-mustard tracking-widest mb-1">איפוס סיסמה</p>
        <h2 className="font-display text-4xl mb-8">שכחת סיסמה?</h2>

        {resetSent ? (
          <p className="font-body text-sm text-paper-light/70">
            אם הכתובת <span className="text-paper-light">{email}</span> רשומה אצלנו, נשלח אליה קישור לאיפוס סיסמה.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <div>
              <label className="font-mono text-[11px] tracking-widest text-paper-light/50 uppercase block mb-1">
                אימייל
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none"
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="font-body text-sm text-rust">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mustard text-ink font-mono text-xs tracking-widest uppercase rounded-sm py-2.5 hover:bg-mustard/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
            </button>
          </form>
        )}

        <button
          onClick={() => {
            setShowForgot(false)
            setResetSent(false)
            setError(null)
          }}
          className="font-body text-sm text-paper-light/50 mt-6 text-center w-full hover:text-paper-light"
        >
          חזרה להתחברות
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto">
      <p className="font-mono text-xs text-mustard tracking-widest mb-1">כניסה</p>
      <h2 className="font-display text-4xl mb-8">חזרה לקראייט</h2>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="font-mono text-[11px] tracking-widest text-paper-light/50 uppercase block mb-1">
            אימייל
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-mono text-[11px] tracking-widest text-paper-light/50 uppercase">
              סיסמה
            </label>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="font-mono text-[11px] tracking-widest text-mustard hover:underline"
            >
              שכחת סיסמה?
            </button>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="font-body text-sm text-rust">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-mustard text-ink font-mono text-xs tracking-widest uppercase rounded-sm py-2.5 hover:bg-mustard/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'מתחברת...' : 'כניסה'}
        </button>
      </form>

      <p className="font-body text-sm text-paper-light/50 mt-6 text-center">
        אין לך חשבון?{' '}
        <Link to="/signup" className="text-mustard hover:underline">
          הרשמה
        </Link>
      </p>
    </div>
  )
}
