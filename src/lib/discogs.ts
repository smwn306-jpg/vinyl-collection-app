export interface DiscogsResult {
  discogsId: number
  masterId: number | null
  title: string
  artist: string
  year: number | null
  genre: string | null
  catalogNo: string | null
  thumb: string | null
}

export interface DiscogsVersion {
  releaseId: number
  title: string
  country: string | null
  released: string | null
  format: string | null
  label: string | null
  catalogNo: string | null
  thumb: string | null
}

export interface DiscogsMaster {
  masterId: number
  title: string
  mainReleaseId: number
  versionCount: number
  versions: DiscogsVersion[]
}

const WORKER_URL = import.meta.env.VITE_DISCOGS_WORKER_URL as string | undefined

function requireWorkerUrl() {
  if (!WORKER_URL) {
    throw new Error(
      'VITE_DISCOGS_WORKER_URL לא מוגדר. פרסי את ה-Worker (תיקיית worker/) והוסיפי את הכתובת שלו.'
    )
  }
  return WORKER_URL
}

export async function searchDiscogs(query: string): Promise<DiscogsResult[]> {
  const base = requireWorkerUrl()
  const res = await fetch(`${base}/search?q=${encodeURIComponent(query)}`)
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
      masterId: r.masterId,
      title,
      artist,
      year: r.year,
      genre: r.genre,
      catalogNo: r.catalogNo,
      thumb: r.thumb,
    } as DiscogsResult
  })
}

export async function getMasterVersions(masterId: number | string): Promise<DiscogsMaster> {
  const base = requireWorkerUrl()
  const res = await fetch(`${base}/master/${masterId}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `שליפת מהדורות נכשלה (${res.status})`)
  }
  return res.json()
}
