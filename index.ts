export interface Env {
  DISCOGS_KEY: string
  DISCOGS_SECRET: string
  ALLOWED_ORIGIN: string
}

// תוצאות חיפוש וגם מהדורות Master Release כמעט לא משתנות — cache ארוך
// חוסך כמעט את כל הקריאות החוזרות ל-Discogs, ושומר אותנו הרחק
// ממגבלת ה-60 בקשות/דקה שלהם.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7

const USER_AGENT = 'CrateApp/1.0 (+https://github.com/your-username/vinyl-collection-app)'

function corsHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const headers = corsHeaders(env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    if (!env.DISCOGS_KEY || !env.DISCOGS_SECRET) {
      return json({ error: 'Discogs credentials not configured on the Worker' }, 500, headers)
    }

    // -----------------------------------------------------------------
    // GET /search?q=...  — חיפוש בקטלוג
    // -----------------------------------------------------------------
    if (url.pathname === '/search') {
      const q = url.searchParams.get('q')?.trim()
      if (!q || q.length < 2) {
        return json({ error: 'Query too short' }, 400, headers)
      }

      const cache = caches.default
      const cacheKey = new Request(url.toString(), request)
      const cached = await cache.match(cacheKey)
      if (cached) {
        const res = new Response(cached.body, cached)
        res.headers.set('X-Cache', 'HIT')
        return res
      }

      const discogsUrl = new URL('https://api.discogs.com/database/search')
      discogsUrl.searchParams.set('q', q)
      discogsUrl.searchParams.set('type', 'release')
      discogsUrl.searchParams.set('key', env.DISCOGS_KEY)
      discogsUrl.searchParams.set('secret', env.DISCOGS_SECRET)

      let discogsRes: Response
      try {
        discogsRes = await fetch(discogsUrl.toString(), { headers: { 'User-Agent': USER_AGENT } })
      } catch {
        return json({ error: 'Failed to reach Discogs' }, 502, headers)
      }
      if (!discogsRes.ok) {
        return json({ error: `Discogs API error (${discogsRes.status})` }, discogsRes.status, headers)
      }

      const data: any = await discogsRes.json()
      const results = (data.results || []).slice(0, 15).map((r: any) => ({
        discogsId: r.id,
        masterId: r.master_id || null,
        title: r.title as string, // דיסקוגס מחזיר בפורמט "Artist - Album"
        year: r.year ? parseInt(r.year, 10) : null,
        genre: (r.genre && r.genre[0]) || null,
        catalogNo: r.catno || null,
        thumb: r.thumb || null,
      }))

      const response = new Response(JSON.stringify({ results }), {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      })
      await cache.put(cacheKey, response.clone())
      return response
    }

    // -----------------------------------------------------------------
    // GET /master/:id  — כל המהדורות/גרסאות של אלבום (Master Release)
    // -----------------------------------------------------------------
    const masterMatch = url.pathname.match(/^\/master\/(\d+)$/)
    if (masterMatch) {
      const masterId = masterMatch[1]

      const cache = caches.default
      const cacheKey = new Request(url.toString(), request)
      const cached = await cache.match(cacheKey)
      if (cached) {
        const res = new Response(cached.body, cached)
        res.headers.set('X-Cache', 'HIT')
        return res
      }

      const masterUrl = new URL(`https://api.discogs.com/masters/${masterId}`)
      masterUrl.searchParams.set('key', env.DISCOGS_KEY)
      masterUrl.searchParams.set('secret', env.DISCOGS_SECRET)

      const versionsUrl = new URL(`https://api.discogs.com/masters/${masterId}/versions`)
      versionsUrl.searchParams.set('key', env.DISCOGS_KEY)
      versionsUrl.searchParams.set('secret', env.DISCOGS_SECRET)
      versionsUrl.searchParams.set('per_page', '50')

      let masterRes: Response, versionsRes: Response
      try {
        ;[masterRes, versionsRes] = await Promise.all([
          fetch(masterUrl.toString(), { headers: { 'User-Agent': USER_AGENT } }),
          fetch(versionsUrl.toString(), { headers: { 'User-Agent': USER_AGENT } }),
        ])
      } catch {
        return json({ error: 'Failed to reach Discogs' }, 502, headers)
      }

      if (!masterRes.ok) {
        return json({ error: `Discogs API error (${masterRes.status})` }, masterRes.status, headers)
      }

      const master: any = await masterRes.json()
      const versionsData: any = versionsRes.ok ? await versionsRes.json() : { versions: [] }

      const result = {
        masterId: master.id,
        title: master.title,
        mainReleaseId: master.main_release,
        yearsActive: master.year || null,
        versionCount: (versionsData.versions || []).length,
        versions: (versionsData.versions || []).map((v: any) => ({
          releaseId: v.id,
          title: v.title,
          country: v.country || null,
          released: v.released || null,
          format: v.major_formats ? v.major_formats.join(', ') : null,
          label: v.label || null,
          catalogNo: v.catno || null,
          thumb: v.thumb || null,
        })),
      }

      const response = new Response(JSON.stringify(result), {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      })
      await cache.put(cacheKey, response.clone())
      return response
    }

    return json({ error: 'Not found' }, 404, headers)
  },
}
