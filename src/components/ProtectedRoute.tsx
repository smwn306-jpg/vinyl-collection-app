import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [blocked, setBlocked] = useState(false)

  // בדיקה חיה, לא רק בכניסה — אם אדמין חוסם משתמש שכרגע פעיל באפליקציה,
  // הוא מנותק אוטומטית באותו רגע, לא רק בפעם הבאה שינסה להתחבר.
  useEffect(() => {
    if (!user) return
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists() && snap.data().blocked) {
        setBlocked(true)
        signOut(auth)
      }
    })
    return unsubscribe
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-xs tracking-widest text-paper-light/50">טוען...</p>
      </div>
    )
  }

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="font-body text-sm text-rust text-center">
          החשבון הזה נחסם. פני לתמיכה אם זו טעות.
        </p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
