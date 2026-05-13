// Fotocasa agency-profile scraper.
//
// A pro profile URL looks like https://www.fotocasa.es/es/inmobiliaria/<slug>-<id>/
// Listing cards are <article class="re-CardPackPremium"> or <article class="re-CardPack">,
// each with an anchor whose path contains the listing ID at the tail (digits).
// Fotocasa renders most of the grid server-side; subsequent pages are at
// .../pagina/<n>/

import * as cheerio from 'cheerio';
import { fetchHtml } from './http.js';

const MAX_PAGES = 20;

function inferType(text) {
  const t = text.toLowerCase();
  if (/\bfinca\b|terreno|parcela|solar\b/.test(t)) return 'finca';
  if (/\bchalet\b|\bcasa\b|\bvilla\b|adosad|pareado|unifamiliar/.test(t)) return 'house';
  if (/\bpiso\b|apartamento|\bático\b|\báatico\b|d[uú]plex|estudio/.test(t)) return 'apartment';
  if (/local|oficin|nave\b|industri|comerc|hotel|edificio|negocio/.test(t)) return 'commercial';
  return 'apartment';
}

function parsePrice(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractCard($, el) {
  const $card = $(el);
  const anchor = $card.find('a[href*="/d"]').first().length
    ? $card.find('a[href*="/d"]').first()
    : $card.find('a').first();
  const href = anchor.attr('href') || '';
  const idMatch = href.match(/\/(\d{6,})\/?(?:$|\?|#)/);
  if (!idMatch) return null;
  const externalId = idMatch[1];
  const url = href.startsWith('http') ? href : `https://www.fotocasa.es${href}`;

  const title =
    $card.find('.re-CardTitle, [class*="CardPackTitle"], [class*="CardTitle"]').first().text().trim() ||
    anchor.attr('title')?.trim() ||
    anchor.text().trim();

  const priceRaw =
    $card.find('[class*="Price"], .re-CardPrice').first().text().trim() ||
    $card.find('[class*="price"]').first().text().trim();

  const description = $card.find('[class*="Description"], [class*="Features"]').first().text().trim().slice(0, 2000);
  const location = $card.find('[class*="Location"], [class*="address"]').first().text().trim() || null;

  const images = [];
  $card.find('img').each((_, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src');
    if (src && /^https?:/.test(src) && !images.includes(src)) images.push(src);
  });

  return {
    source: 'fotocasa',
    externalId,
    title: title || `Inmueble ${externalId}`,
    description: description || null,
    price: parsePrice(priceRaw),
    location,
    address: null,
    propertyType: inferType(`${title} ${description}`),
    images: images.slice(0, 10),
    url,
  };
}

function normalizeProfileUrl(input) {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, '');
  return url;
}

export async function scrapeFotocasaProfile(profileUrl, { logger = () => {} } = {}) {
  const base = normalizeProfileUrl(profileUrl);
  if (!/fotocasa\.es\//i.test(base)) {
    return { ok: false, error: 'invalid_profile_url', message: 'Esperado: https://www.fotocasa.es/es/inmobiliaria/<slug>/' };
  }

  const seen = new Set();
  const listings = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? `${base}/` : `${base}/pagina/${page}/`;
    logger({ kind: 'page_start', page, url: pageUrl });

    let res;
    try {
      res = await fetchHtml(pageUrl);
    } catch (err) {
      return { ok: false, error: 'network_error', message: err.message, partial: listings };
    }

    if (res.status === 404 && page > 1) break;
    if (res.status >= 400) {
      return {
        ok: false,
        error: res.status === 403 || res.status === 429 ? 'blocked' : 'http_error',
        status: res.status,
        partial: listings,
        message:
          res.status === 403 || res.status === 429
            ? 'Fotocasa bloqueó la petición. Reintentaremos con navegador headless en una próxima versión.'
            : `HTTP ${res.status}`,
      };
    }

    const $ = cheerio.load(res.html);
    const cards = $('article[class*="CardPack"], article.re-CardPack');
    if (cards.length === 0) {
      logger({ kind: 'page_empty', page });
      break;
    }

    let addedOnPage = 0;
    cards.each((_, el) => {
      const card = extractCard($, el);
      if (!card) return;
      if (seen.has(card.externalId)) return;
      seen.add(card.externalId);
      listings.push(card);
      addedOnPage++;
    });

    logger({ kind: 'page_done', page, addedOnPage, total: listings.length });
    if (addedOnPage === 0) break;
  }

  return { ok: true, listings };
}
