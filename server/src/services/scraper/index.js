// Scraper dispatcher. Picks the right adapter from the profile URL.

import { scrapeIdealistaProfile } from './idealista.js';
import { scrapeFotocasaProfile } from './fotocasa.js';

export function detectPortal(url) {
  if (/idealista\.com\/pro\//i.test(url)) return 'idealista';
  if (/fotocasa\.es\//i.test(url)) return 'fotocasa';
  return null;
}

export async function scrapeProfile(url, opts) {
  const portal = detectPortal(url);
  if (portal === 'idealista') return scrapeIdealistaProfile(url, opts);
  if (portal === 'fotocasa') return scrapeFotocasaProfile(url, opts);
  return { ok: false, error: 'unsupported_portal', message: 'URL no soportada. Usa Idealista Pro o Fotocasa.' };
}
