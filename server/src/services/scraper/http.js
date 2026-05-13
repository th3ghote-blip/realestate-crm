// Shared fetch wrapper for portal scraping.
// Idealista and Fotocasa both respond to vanilla GETs with a server-rendered
// listing grid (for SEO), so cheerio + a realistic UA is enough for the common
// case. Cloudflare/bot-wall responses are handled by the caller — if status
// is 4xx/5xx or the body lacks listing markers, the per-portal adapter returns
// a structured error and the job surfaces "blocked, retry with browser".

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function fetchHtml(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    });
    const html = await res.text();
    return { status: res.status, html, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}
