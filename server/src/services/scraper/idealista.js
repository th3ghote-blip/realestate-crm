// Idealista "pro" agency-profile scraper.
//
// A pro profile URL looks like https://www.idealista.com/pro/<agency-slug>/
// The page is paginated; each card has a stable structure with article[data-element-id]
// and an anchor to /inmueble/<external-id>/. Photos are eager-loaded as <img src> or
// data-src on first card, lazy elsewhere. Price is in span.item-price.
//
// We walk pages until we see no new external IDs, or until a hard cap (defensive
// against pagination bugs / agencies with 5000 listings — out of scope for v1).

import * as cheerio from 'cheerio';
import { fetchHtml } from './http.js';

const MAX_PAGES = 20;

function inferType($card) {
  const text = ($card.find('.item-link').text() + ' ' + $card.find('.item-detail-char').text()).toLowerCase();
  if (/\bfinca\b|\brústic|rustic|terreno|parcela|solar\b/.test(text)) return 'finca';
  if (/\bch[aá]let\b|\bcasa\b|\bvilla\b|adosad|pareado|unifamiliar/.test(text)) return 'house';
  if (/\bpiso\b|\bapartamento\b|\báatico\b|\bático\b|\bestudio\b|d[uú]plex/.test(text)) return 'apartment';
  if (/local|oficin|nave\b|industri|comerc|hotel|edificio|negocio/.test(text)) return 'commercial';
  if (/garaje|trastero|plaza de garaje/.test(text)) return 'other';
  return 'apartment'; // safest default for residential agency pages
}

function parsePrice(raw) {
  if (!raw) return null;
  // "295.000 €/mes" or "1.290.000 €" — strip non-digits except commas/periods, then drop separators.
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractCard($, el) {
  const $card = $(el);
  const linkAnchor = $card.find('a.item-link').first();
  const href = linkAnchor.attr('href') || '';
  const idMatch = href.match(/\/inmueble\/(\d+)/);
  if (!idMatch) return null;
  const externalId = idMatch[1];
  const url = href.startsWith('http') ? href : `https://www.idealista.com${href}`;

  const title = linkAnchor.attr('title')?.trim() || linkAnchor.text().trim();
  const priceRaw = $card.find('.item-price, [data-element-name="price"]').first().text().trim();
  const description = $card.find('.item-description, .ellipsis').first().text().trim().slice(0, 2000);
  const location = $card.find('.item-detail-char, .item-location').first().text().trim() || null;

  const images = [];
  $card.find('img').each((_, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy');
    if (src && /^https?:/.test(src) && !images.includes(src)) images.push(src);
  });

  return {
    source: 'idealista',
    externalId,
    title: title || `Inmueble ${externalId}`,
    description: description || null,
    price: parsePrice(priceRaw),
    location,
    address: null,
    propertyType: inferType($card),
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

export async function scrapeIdealistaProfile(profileUrl, { logger = () => {} } = {}) {
  const base = normalizeProfileUrl(profileUrl);
  if (!/idealista\.com\/pro\//i.test(base)) {
    return { ok: false, error: 'invalid_profile_url', message: 'Esperado: https://www.idealista.com/pro/<agencia>/' };
  }

  const seen = new Set();
  const listings = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = page === 1 ? `${base}/` : `${base}/pagina-${page}.htm`;
    logger({ kind: 'page_start', page, url: pageUrl });

    let res;
    try {
      res = await fetchHtml(pageUrl);
    } catch (err) {
      return { ok: false, error: 'network_error', message: err.message, partial: listings };
    }

    if (res.status === 404 && page > 1) break; // ran past last page
    if (res.status >= 400) {
      // 403 here typically means Idealista's bot wall fired. Surface to the caller.
      return {
        ok: false,
        error: res.status === 403 || res.status === 429 ? 'blocked' : 'http_error',
        status: res.status,
        partial: listings,
        message:
          res.status === 403 || res.status === 429
            ? 'Idealista bloqueó la petición. Reintentaremos con navegador headless en una próxima versión.'
            : `HTTP ${res.status}`,
      };
    }

    const $ = cheerio.load(res.html);
    const cards = $('article.item, article[data-element-id]');
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

    if (addedOnPage === 0) break; // no new IDs => end of pagination
  }

  return { ok: true, listings };
}
