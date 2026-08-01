// =============================================================================
// הדביקי את כל התוכן הזה בעורך הקוד בדפדפן של Cloudflare
// (Dashboard → Workers & Pages → discogs-proxy → Edit code).
// =============================================================================

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;
// TODO: תחליפי contact@example.com במייל אמיתי שלך — Discogs ממליץ על זה
// כדי שיוכלו ליצור קשר אם יש בעיה, ולפעמים זה מקל על יחס ה-rate limit.
const USER_AGENT = 'CrateApp/1.0 (+https://github.com/your-username/vinyl-collection-app; contact@example.com)';
const RATE_LIMIT_MESSAGE = 'בוצעו יותר מדי חיפושים בזמן קצר. המערכת ממתינה מספר שניות — נסי שוב.';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// עוטפת כל קריאה ל-Discogs: אם מתקבל 429, ממתינה לפי Retry-After (עד תקרה
// של 5 שניות כדי לא לתקוע את ה-Worker), ומנסה עוד פעם אחת בלבד.
async function fetchDiscogs(url) {
  let res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });

  if (res.status === 429) {
    const retryAfterHeader = res.headers.get('Retry-After');
    const waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2;
    const waitMs = Math.min(Math.max(waitSeconds, 1) * 1000, 5000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
  }

  return res;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (!env.DISCOGS_KEY || !env.DISCOGS_SECRET) {
      return json({ error: 'Discogs credentials not configured on the Worker' }, 500, headers);
    }

    // -----------------------------------------------------------------
    // GET /search?q=...  — חיפוש בקטלוג
    // -----------------------------------------------------------------
    if (url.pathname === '/search') {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q || q.length < 2) {
        return json({ error: 'Query too short' }, 400, headers);
      }

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
        discogsRes = await fetchDiscogs(discogsUrl);
      } catch (e) {
        return json({ error: 'Failed to reach Discogs' }, 502, headers);
      }

      if (discogsRes.status === 429) {
        return json({ error: RATE_LIMIT_MESSAGE }, 429, headers);
      }
      if (!discogsRes.ok) {
        return json({ error: `Discogs API error (${discogsRes.status})` }, discogsRes.status, headers);
      }

      const data = await discogsRes.json();
      const results = (data.results || []).slice(0, 15).map((r) => ({
        discogsId: r.id,
        masterId: r.master_id || null,
        title: r.title,
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
    }

    // -----------------------------------------------------------------
    // GET /master/:id  — כל המהדורות/גרסאות של אלבום (Master Release)
    // -----------------------------------------------------------------
    const masterMatch = url.pathname.match(/^\/master\/(\d+)$/);
    if (masterMatch) {
      const masterId = masterMatch[1];

      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cached = await cache.match(cacheKey);
      if (cached) {
        const res = new Response(cached.body, cached);
        res.headers.set('X-Cache', 'HIT');
        return res;
      }

      const masterUrl = new URL(`https://api.discogs.com/masters/${masterId}`);
      masterUrl.searchParams.set('key', env.DISCOGS_KEY);
      masterUrl.searchParams.set('secret', env.DISCOGS_SECRET);

      const versionsUrl = new URL(`https://api.discogs.com/masters/${masterId}/versions`);
      versionsUrl.searchParams.set('key', env.DISCOGS_KEY);
      versionsUrl.searchParams.set('secret', env.DISCOGS_SECRET);
      versionsUrl.searchParams.set('per_page', '50');

      let masterRes, versionsRes;
      try {
        [masterRes, versionsRes] = await Promise.all([
          fetchDiscogs(masterUrl),
          fetchDiscogs(versionsUrl),
        ]);
      } catch (e) {
        return json({ error: 'Failed to reach Discogs' }, 502, headers);
      }

      if (masterRes.status === 429) {
        return json({ error: RATE_LIMIT_MESSAGE }, 429, headers);
      }
      if (!masterRes.ok) {
        return json({ error: `Discogs API error (${masterRes.status})` }, masterRes.status, headers);
      }

      const master = await masterRes.json();
      const versionsData = versionsRes.ok ? await versionsRes.json() : { versions: [] };

      const result = {
        masterId: master.id,
        title: master.title,
        mainReleaseId: master.main_release,
        yearsActive: master.year || null,
        versionCount: (versionsData.versions || []).length,
        versions: (versionsData.versions || []).map((v) => ({
          releaseId: v.id,
          title: v.title,
          country: v.country || null,
          released: v.released || null,
          format: v.major_formats ? v.major_formats.join(', ') : null,
          label: v.label || null,
          catalogNo: v.catno || null,
          thumb: v.thumb || null,
        })),
      };

      const response = new Response(JSON.stringify(result), {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      });
      await cache.put(cacheKey, response.clone());
      return response;
    }

    return json({ error: 'Not found' }, 404, headers);
  },
};
