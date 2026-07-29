export interface Env {
  DISCOGS_KEY: string
  DISCOGS_SECRET: string
  ALLOWED_ORIGIN: string
}

// תוצאות חיפוש בקטלוג כמעט לא משתנות — שבוע cache חוסך כמעט את כל הקריאות
// החוזרות ל-Discogs, ושומר אותנו הרחק ממגבלת ה-60 בקשות/דקה שלהם.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7

function corsHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const headers = corsHeaders(env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    if (url.pathname !== '/search') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const q = url.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      return new Response(JSON.stringify({ error: 'Query too short' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (!env.DISCOGS_KEY || !env.DISCOGS_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Discogs credentials not configured on the Worker' }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      )
    }

    // מטמון ברמת ה-edge של Cloudflare (חינמי) — אותה שאילתה, מכל משתמש בעולם,
    // תיענה ממטמון אחרי הפעם הראשונה, בלי לפנות שוב ל-Discogs.
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
      discogsRes = await fetch(discogsUrl.toString(), {
        headers: {
          // Discogs דורש User-Agent מזוהה, אחרת חוסמים את הבקשה
          'User-Agent': 'CrateApp/1.0 (+https://github.com/your-username/vinyl-collection-app)',
        },
      })
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to reach Discogs' }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    if (!discogsRes.ok) {
      return new Response(JSON.stringify({ error: `Discogs API error (${discogsRes.status})` }), {
        status: discogsRes.status,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const data: any = await discogsRes.json()
    const results = (data.results || []).slice(0, 15).map((r: any) => ({
      discogsId: r.id,
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

    // שומרים במטמון בלי לחכות — לא מעכבים את התשובה למשתמש
    await cache.put(cacheKey, response.clone())
    return response
  },
}
