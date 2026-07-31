import { useEffect, useState } from 'react'
import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { UserProfile } from '../types'

export default function Admin() {
  const { user } = useAuth()
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null)
  const [checkingRole, setCheckingRole] = useState(true)

  const [totalUsers, setTotalUsers] = useState<number | null>(null)
  const [totalRecords, setTotalRecords] = useState<number | null>(null)
  const [users, setUsers] = useState<(UserProfile & { recordCount: number | null })[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // בדיקת הרשאה: לא מספיק להסתיר את הטאב — צריך לוודא שגם מי שמקליד /admin
  // ידנית בכתובת לא רואה כלום אם הוא לא אדמין. ה-Firestore rules חוסמות את
  // הנתונים בפועל בכל מקרה; זו רק שכבת UI נוספת.
  useEffect(() => {
    if (!user) return
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setMyProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null)
      setCheckingRole(false)
    })
    return unsubscribe
  }, [user])

  useEffect(() => {
    if (myProfile?.role !== 'admin') return

    getCountFromServer(collection(db, 'users')).then((snap) => setTotalUsers(snap.data().count))
    getCountFromServer(collectionGroup(db, 'collection')).then((snap) =>
      setTotalRecords(snap.data().count)
    )

    getDocs(collection(db, 'users')).then(async (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProfile)
      setUsers(list.map((u) => ({ ...u, recordCount: null })))
      setLoadingUsers(false)

      // כמות תקליטים לכל משתמש נשלפת בנפרד ומתמלאת בהדרגה, כדי לא לחסום
      // את הצגת הטבלה עד שכל ה-N שאילתות חוזרות.
      list.forEach(async (u) => {
        const countSnap = await getCountFromServer(collection(db, 'users', u.id, 'collection'))
        setUsers((prev) =>
          prev.map((p) => (p.id === u.id ? { ...p, recordCount: countSnap.data().count } : p))
        )
      })
    })
  }, [myProfile])

  const toggleRole = async (u: UserProfile) => {
    await updateDoc(doc(db, 'users', u.id), { role: u.role === 'admin' ? 'user' : 'admin' })
  }

  const toggleBlocked = async (u: UserProfile) => {
    await updateDoc(doc(db, 'users', u.id), { blocked: !u.blocked })
  }

  if (checkingRole) {
    return <p className="font-mono text-xs text-paper-light/40 tracking-widest">בודקת הרשאות...</p>
  }

  if (myProfile?.role !== 'admin') {
    return (
      <div>
        <p className="font-body text-sm text-rust">אין לך הרשאת גישה לעמוד הזה.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="font-mono text-xs text-mustard tracking-widest mb-1">אזור אדמין</p>
      <h2 className="font-display text-4xl mb-8">דשבורד ניהול</h2>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-sm border border-paper-light/10 p-4">
          <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase mb-1">
            משתמשים רשומים
          </p>
          <p className="font-display text-3xl">{totalUsers ?? '—'}</p>
        </div>
        <div className="rounded-sm border border-paper-light/10 p-4">
          <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase mb-1">
            תקליטים במערכת (כולם)
          </p>
          <p className="font-display text-3xl">{totalRecords ?? '—'}</p>
        </div>
      </div>

      <p className="font-mono text-[10px] tracking-widest text-paper-light/40 uppercase mb-3">
        ניהול משתמשים
      </p>

      {loadingUsers ? (
        <p className="font-mono text-xs text-paper-light/40 tracking-widest">טוען...</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-paper-light/10">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-right font-mono text-[10px] tracking-widest text-paper-light/40 uppercase">
                <th className="px-4 py-3">שם</th>
                <th className="px-4 py-3">אימייל</th>
                <th className="px-4 py-3">תפקיד</th>
                <th className="px-4 py-3">תקליטים</th>
                <th className="px-4 py-3">סטטוס</th>
                <th className="px-4 py-3">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-paper-light/10">
                  <td className="px-4 py-3 font-body">{u.displayName || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-paper-light/60">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded ${
                        u.role === 'admin' ? 'bg-mustard/20 text-mustard' : 'bg-teal/20 text-teal'
                      }`}
                    >
                      {u.role === 'admin' ? 'מנהל' : 'משתמש'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{u.recordCount ?? '...'}</td>
                  <td className="px-4 py-3">
                    {u.blocked ? (
                      <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded bg-rust/20 text-rust">
                        חסום
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-paper-light/40">פעיל</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleRole(u)}
                        disabled={u.id === myProfile.id}
                        className="font-mono text-[10px] uppercase text-teal hover:underline disabled:opacity-30 disabled:no-underline"
                      >
                        {u.role === 'admin' ? 'הסר ניהול' : 'הפוך למנהל'}
                      </button>
                      <button
                        onClick={() => toggleBlocked(u)}
                        disabled={u.id === myProfile.id}
                        className="font-mono text-[10px] uppercase text-rust hover:underline disabled:opacity-30 disabled:no-underline"
                      >
                        {u.blocked ? 'שחרר' : 'חסום'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
