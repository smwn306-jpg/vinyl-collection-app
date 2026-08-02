export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  return Notification.requestPermission()
}

export function showNotification(title: string, body: string) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  // תופס גם את המקרה שהאתר פתוח בכמה טאבים — כל אחד יציג את ההתראה בנפרד,
  // וזה בסדר (עדיף כפילות קטנה על החמצת הודעה).
  new Notification(title, {
    body,
    icon: '/icon-192.png',
    tag: 'crate-message', // התראות עוקבות מאותו tag מחליפות זו את זו, לא נערמות
  })
}
