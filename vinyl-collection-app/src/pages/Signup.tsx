import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile, AuthError } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'כבר יש חשבון עם האימייל הזה'
    case 'auth/invalid-email':
      return 'כתובת האימייל לא תקינה'
    case 'auth/weak-password':
      return 'הסיסמה חלשה מדי — לפחות 6 תווים'
    default:
      return 'משהו השתבש. נסי שוב'
  }
}

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(credential.user, { displayName: name })

      // יוצרים את מסמך הפרופיל הציבורי. role תמיד 'user' —
      // firestore.rules חוסמות יצירת משתמש עם role 'admin' ישירות מהלקוח.
      await setDoc(doc(db, 'users', credential.user.uid), {
        displayName: name,
        email,
        role: 'user',
      })

      navigate('/')
    } catch (err) {
      setError(friendlyAuthError(err as AuthError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <p className="font-mono text-xs text-mustard tracking-widest mb-1">הרשמה</p>
      <h2 className="font-display text-4xl mb-8">התחל אוסף</h2>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="font-mono text-[11px] tracking-widest text-paper-light/50 uppercase block mb-1">
            שם
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none"
            placeholder="השם שלך"
          />
        </div>
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
          <label className="font-mono text-[11px] tracking-widest text-paper-light/50 uppercase block mb-1">
            סיסמה
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none"
            placeholder="לפחות 6 תווים"
          />
        </div>

        {error && <p className="font-body text-sm text-rust">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-mustard text-ink font-mono text-xs tracking-widest uppercase rounded-sm py-2.5 hover:bg-mustard/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'יוצרת חשבון...' : 'יצירת חשבון'}
        </button>
      </form>

      <p className="font-body text-sm text-paper-light/50 mt-6 text-center">
        כבר יש לך חשבון?{' '}
        <Link to="/login" className="text-mustard hover:underline">
          כניסה
        </Link>
      </p>
    </div>
  )
}
