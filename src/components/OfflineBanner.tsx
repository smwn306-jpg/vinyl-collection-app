import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="bg-rust text-paper-light text-center py-1.5">
      <p className="font-mono text-[11px] tracking-widest uppercase">
        אין חיבור לרשת — צופה בנתונים שמורים מקומית. שינויים יסתנכרנו כשהחיבור יחזור.
      </p>
    </div>
  )
}
