export interface DiscogsResult {
  discogsId: number
  title: string
  artist: string
  year: number | null
  genre: string | null
  catalogNo: string | null
  thumb: string | null
}

const WORKER_URL = import.meta.env.VITE_DISCOGS_WORKER_URL as string | undefined

export async function searchDiscogs(query: string): Promise<DiscogsResult[]> {
  if (!WORKER_URL) {
    throw new Error(
      'VITE_DISCOGS_WORKER_URL לא מוגדר ב-.env.local. פרסי את ה-Worker (תיקיית worker/) והוסיפי את הכתובת שלו.'
    )
  }

  const res = await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `חיפוש נכשל (${res.status})`)
  }

  const data = await res.json()
  return (data.results || []).map((r: any) => {
    // Discogs מחזיר את הכותרת בפורמט "Artist - Album"
    const raw = String(r.title || '')
    const sepIndex = raw.indexOf(' - ')
    const artist = sepIndex > -1 ? raw.slice(0, sepIndex) : ''
    const title = sepIndex > -1 ? raw.slice(sepIndex + 3) : raw

    return {
      discogsId: r.discogsId,
      title,
      artist,
      year: r.year,
      genre: r.genre,
      catalogNo: r.catalogNo,
      thumb: r.thumb,
    } as DiscogsResult
  })
}
