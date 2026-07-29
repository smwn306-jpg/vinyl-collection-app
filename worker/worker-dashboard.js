// =============================================================================
// גרסה זו מיועדת להדבקה ישירה בעורך הקוד בדפדפן של Cloudflare
// (Dashboard → Workers & Pages → Create → Create Worker → עורך "Quick edit").
// אין צורך ב-npm, ב-wrangler, או בשום דבר מותקן במחשב.
//
// אחרי ההדבקה: Settings → Variables → Encrypted Variables → הוסיפי
// DISCOGS_KEY ו-DISCOGS_SECRET (שניהם "Encrypt" כדי שיהיו סודיים).
// ואז: Settings → Variables → הוסיפי גם ALLOWED_ORIGIN (לא מוצפן) עם כתובת האתר שלך.
// =============================================================================

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // שבוע — חוסך כמעט את כל הקריאות החוזרות ל-Discogs

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (url.pathname !== '/search') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const q = (url.searchParams.get('q') || '').trim();
    if (!q || q.length < 2) {
      return new Response(JSON.stringify({ error: 'Query too short' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (!env.DISCOGS_KEY || !env.DISCOGS_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Discogs credentials not configured on the Worker' }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // מטמון ברמת ה-edge של Cloudflare (חינמי) — שאילתה זהה, מכל משתמש בעולם,
    // תיענה מהמטמון אחרי הפעם הראשונה, בלי לפנות שוב ל-Discogs.
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cached = await cache.match(cacheKey);
    if (cached) {
      const res = new Response(cached.body, cached);
      res.headers.set('X-Cache', 'HIT');
      return res;
    }

    const discogsUrl = new URL('https://api.discogs.com/database/search');
    discogsUrl.searchParams.set('q', q);
    discogsUrl.searchParams.set('type', 'release');
    discogsUrl.searchParams.set('key', env.DISCOGS_KEY);
    discogsUrl.searchParams.set('secret', env.DISCOGS_SECRET);

    let discogsRes;
    try {
      discogsRes = await fetch(discogsUrl.toString(), {
        headers: {
          'User-Agent': 'CrateApp/1.0 (+https://github.com/your-username/vinyl-collection-app)',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Failed to reach Discogs' }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (!discogsRes.ok) {
      return new Response(JSON.stringify({ error: `Discogs API error (${discogsRes.status})` }), {
        status: discogsRes.status,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const data = await discogsRes.json();
    const results = (data.results || []).slice(0, 15).map((r) => ({
      discogsId: r.id,
      title: r.title, // דיסקוגס מחזיר בפורמט "Artist - Album"
      year: r.year ? parseInt(r.year, 10) : null,
      genre: (r.genre && r.genre[0]) || null,
      catalogNo: r.catno || null,
      thumb: r.thumb || null,
    }));

    const response = new Response(JSON.stringify({ results }), {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });

    await cache.put(cacheKey, response.clone());
    return response;
  },
};
