import { useEffect, useRef } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { showNotification } from './notifications'
import { Message } from '../types'

export function useIncomingMessageNotifications(userId: string | undefined) {
  // ה-snapshot הראשון מכיל את כל ההודעות הקיימות (גם ישנות) — לא רוצים
  // "להתריע" עליהן בכל טעינת דף. רק docChanges מסוג 'added' שמגיעים
  // אחרי הטעינה הראשונה נחשבים "הודעה חדשה באמת".
  const hasLoadedInitial = useRef(false)

  useEffect(() => {
    if (!userId) return
    hasLoadedInitial.current = false

    const q = query(collection(db, 'messages'), where('receiverId', '==', userId))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!hasLoadedInitial.current) {
        hasLoadedInitial.current = true
        return
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data() as Message
          showNotification('הודעה חדשה ב-Crate', msg.message)
        }
      })
    })

    return unsubscribe
  }, [userId])
}
