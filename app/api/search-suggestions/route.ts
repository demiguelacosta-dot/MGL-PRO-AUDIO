import { NextRequest, NextResponse } from 'next/server';

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isVevoResult(title: string) {
  return /\bvevo\b/i.test(title);
}

function makeCoverArt(label: string) {
  const safeText = stripAccents(label).replace(/&/g, 'and').replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 18) || 'MUSIC';
  const palette = ['#22c55e', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];
  const base = palette[Math.abs(safeText.length) % palette.length];
  const accent = palette[(Math.abs(safeText.length) + 2) % palette.length];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${base}"/>
          <stop offset="100%" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="34" fill="url(#g)"/>
      <circle cx="58" cy="55" r="24" fill="rgba(255,255,255,0.17)"/>
      <path d="M84 42v52c0 9-7 16-16 16s-16-7-16-16 7-16 16-16c4 0 8 1 12 4V30l42 12v42c0 9-7 16-16 16s-16-7-16-16 7-16 16-16c4 0 8 1 12 4V42Z" fill="rgba(255,255,255,0.9)"/>
      <text x="80" y="125" text-anchor="middle" fill="rgba(255,255,255,0.96)" font-size="14" font-family="Arial, sans-serif" font-weight="700">${safeText.toUpperCase()}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function decodeRunText(value: string) {
  return value
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&')
    .replace(/\\u002f/g, '/')
    .replace(/\\u002d/g, '-')
    .replace(/\\/g, '');
}

function normalizeYoutubeResults(raw: unknown): Array<{ text: string; cover: string; videoId: string }> {
  if (!raw || typeof raw !== 'object' || !('items' in raw) || !Array.isArray((raw as { items?: unknown[] }).items)) {
    return [];
  }

  const list: Array<{ text: string; cover: string; videoId: string }> = [];
  for (const item of (raw as { items: Array<Record<string, unknown>> }).items) {
    const snippet = item?.snippet as Record<string, unknown> | undefined;
    const id = item?.id as Record<string, unknown> | undefined;
    const title = typeof snippet?.title === 'string' ? snippet.title.trim() : '';
    const videoId = typeof id?.videoId === 'string' ? id.videoId.trim() : '';
    if (!title || !videoId || isVevoResult(title)) continue;

    const thumbnails = (snippet?.thumbnails as Record<string, Record<string, unknown>> | undefined) ?? {};
    const cover =
      typeof thumbnails?.high?.url === 'string'
        ? thumbnails.high.url
        : typeof thumbnails?.medium?.url === 'string'
          ? thumbnails.medium.url
          : typeof thumbnails?.default?.url === 'string'
            ? thumbnails.default.url
            : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    list.push({ text: title, cover, videoId });
  }

  return list.slice(0, 7);
}

function normalizeYoutubeHtmlSuggestions(html: string): Array<{ text: string; cover: string; videoId: string }> {
  const results: Array<{ text: string; cover: string; videoId: string }> = [];
  const seen = new Set<string>();

  const regex = /"videoId":"([A-Za-z0-9_-]{11})"[\s\S]{0,900}?"title":{"runs":\[(.*?)\]\}/g;
  const matches = html.matchAll(regex);

  for (const match of matches) {
    const videoId = match[1];
    const runs = match[2];
    if (!videoId || !runs) continue;

    const textMatches = [...runs.matchAll(/"text":"((?:\\.|[^"\\])*)"/g)];
    const text = textMatches.map((entry) => decodeRunText(entry[1])).join('').trim();

    if (!text || isVevoResult(text) || seen.has(videoId)) continue;
    seen.add(videoId);
    results.push({
      text,
      cover: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId,
    });

    if (results.length >= 7) break;
  }

  return results;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const results = new Map<string, { text: string; cover: string; videoId?: string }>();

  const youtubeKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  if (youtubeKey) {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('q', `${q} -VEVO`);
      url.searchParams.set('type', 'video');
      url.searchParams.set('maxResults', '8');
      url.searchParams.set('key', youtubeKey);
      url.searchParams.set('videoEmbeddable', 'true');
      url.searchParams.set('safeSearch', 'moderate');

      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        for (const item of normalizeYoutubeResults(data)) {
          const key = stripAccents(item.text).toLowerCase();
          if (!results.has(key)) {
            results.set(key, { text: item.text, cover: item.cover, videoId: item.videoId });
          }
        }
      }
    } catch {
      // fallback to HTML search below
    }
  }

  if (results.size === 0) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
      const htmlRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const htmlResults = normalizeYoutubeHtmlSuggestions(html);
        for (const item of htmlResults) {
          const key = stripAccents(item.text).toLowerCase();
          if (!results.has(key)) {
            results.set(key, { text: item.text, cover: item.cover, videoId: item.videoId });
          }
        }
      }
    } catch {
      // continue to Google fallback
    }
  }

  if (results.size === 0) {
    try {
      const googleUrl = new URL('https://suggestqueries.google.com/complete/search');
      googleUrl.searchParams.set('client', 'firefox');
      googleUrl.searchParams.set('ds', 'yt');
      googleUrl.searchParams.set('q', q);

      const res = await fetch(googleUrl.toString(), { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        const suggestions = Array.isArray(parsed?.[1]) ? parsed[1] : [];

        for (const suggestion of suggestions) {
          const value = typeof suggestion === 'string' ? suggestion.trim() : '';
          const clean = value.replace(/\s+/g, ' ').trim();
          if (!clean) continue;
          const key = stripAccents(clean).toLowerCase();
          if (!results.has(key)) {
            results.set(key, { text: clean, cover: makeCoverArt(clean) });
          }
        }
      }
    } catch {
      // return any results we already have
    }
  }

  return NextResponse.json({
    suggestions: Array.from(results.values()).slice(0, 7),
  });
}
