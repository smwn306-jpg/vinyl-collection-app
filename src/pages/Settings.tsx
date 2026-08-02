import { useState, FormEvent } from 'react'
import {
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  AuthError,
} from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../lib/notifications'

function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'הסיסמה הנוכחית שגויה'
    case 'auth/weak-password':
      return 'הסיסמה החדשה חלשה מדי — לפחות 6 תווים'
    case 'auth/requires-recent-login':
      return 'מסיבות אבטחה, צריך להתחבר מחדש לפני שינוי סיסמה'
    default:
      return 'משהו השתבש. נסי שוב'
  }
}

export default function Settings() {
  const { user } = useAuth()
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission())

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [nameSaved, setNameSaved] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  if (!user) return null

  const handleNameSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setNameSaving(true)
    setNameSaved(false)
    try {
      await updateProfile(user, { displayName: displayName.trim() })
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() })
      setNameSaved(true)
    } finally {
      setNameSaving(false)
    }
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)
    if (newPassword.length < 6) {
      setPasswordError('הסיסמה החדשה חייבת להיות לפחות 6 תווים')
      return
    }
    setPasswordSaving(true)
    try {
      // Firebase דורש "אימות מחדש" לפני פעולה רגישה כמו שינוי סיסמה —
      // גם אם המשתמש כבר מחובר, כדי למנוע ממישהו ששולט בסשן פתוח (למשל
      // מחשב משותף) לשנות סיסמה בלי לדעת את הסיסמה הנוכחית בפועל.
      const credential = EmailAuthProvider.credential(user.email!, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPasswordError(friendlyAuthError(err as AuthError))
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
  }

  return (
    <div className="max-w-md">
      <p className="font-mono text-xs text-mustard tracking-widest mb-1">החשבון שלי</p>
      <h2 className="font-display text-4xl mb-8">הגדרות</h2>

      <div className="mb-4">
        <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase mb-1">
          אימייל
        </p>
        <p className="font-body text-sm text-paper-light/70">{user.email}</p>
      </div>

      <div className="mb-10 pb-10 border-b border-paper-light/10">
        <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase mb-2">
          התראות דפדפן
        </p>
        {!isNotificationSupported() ? (
          <p className="font-body text-sm text-paper-light/50">הדפדפן הזה לא תומך בהתראות.</p>
        ) : notifPermission === 'granted' ? (
          <p className="font-body text-sm text-teal">✓ התראות מופעלות — תקבלי פינג על הודעה חדשה</p>
        ) : notifPermission === 'denied' ? (
          <p className="font-body text-sm text-rust">
            ההתראות חסומות בהגדרות הדפדפן. צריך לאפשר אותן ידנית דרך הגדרות האתר בדפדפן.
          </p>
        ) : (
          <button
            onClick={handleEnableNotifications}
            className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-mustard hover:text-mustard transition-colors"
          >
            הפעלת התראות
          </button>
        )}
      </div>

      <form onSubmit={handleNameSave} className="space-y-3 mb-10 pb-10 border-b border-paper-light/10">
        <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase">
          שם תצוגה
        </p>
        <input
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value)
            setNameSaved(false)
          }}
          className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none"
        />
        {nameSaved && <p className="text-sm text-teal">✓ נשמר</p>}
        <button
          type="submit"
          disabled={nameSaving}
          className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-mustard hover:text-mustard transition-colors disabled:opacity-50"
        >
          {nameSaving ? 'שומר...' : 'שמירה'}
        </button>
      </form>

      <form onSubmit={handlePasswordChange} className="space-y-3">
        <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase">
          החלפת סיסמה
        </p>
        <div>
          <label className="font-mono text-[11px] tracking-widest text-paper-light/50 uppercase block mb-1">
            סיסמה נוכחית
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none"
          />
        </div>
        <div>
          <label className="font-mono text-[11px] tracking-widest text-paper-light/50 uppercase block mb-1">
            סיסמה חדשה
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-transparent border border-paper-light/20 rounded-sm px-3 py-2 font-body text-sm focus:border-mustard outline-none"
          />
        </div>

        {passwordError && <p className="text-sm text-rust">{passwordError}</p>}
        {passwordSaved && <p className="text-sm text-teal">✓ הסיסמה עודכנה</p>}

        <button
          type="submit"
          disabled={passwordSaving}
          className="font-mono text-xs tracking-widest uppercase border border-paper-light/30 rounded-sm px-4 py-2 hover:border-mustard hover:text-mustard transition-colors disabled:opacity-50"
        >
          {passwordSaving ? 'מעדכנת...' : 'עדכון סיסמה'}
        </button>
      </form>
    </div>
  )
}
