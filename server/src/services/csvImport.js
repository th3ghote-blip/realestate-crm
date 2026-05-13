// CSV import for Idealista/Fotocasa portfolio exports.
//
// Both portals offer a "download CSV" in their pro backoffice but the column
// headers are inconsistent — they differ by language (ES/EN/CA), portal,
// and dashboard version. Rather than ship a brittle exact-match parser, we
// normalize headers and run fuzzy matching against a synonym table.
//
// Strategy:
//   1. Parse with csv-parse, headers row + auto-delimiter (",;|\t")
//   2. Lowercase + strip accents on each header key
//   3. Map each header to a canonical field via the SYNONYMS table
//   4. For each row, build a Listing-shaped object; skip rows without an externalId

import { parse } from 'csv-parse/sync';

const SYNONYMS = {
  externalId: ['referencia', 'ref', 'reference', 'codigo', 'code', 'id', 'anuncio', 'listing'],
  title: ['titulo', 'title', 'nombre', 'name', 'anuncio'],
  description: ['descripcion', 'description', 'observaciones', 'comentarios', 'notes'],
  price: ['precio', 'price', 'importe', 'amount', 'pvp'],
  location: ['ubicacion', 'location', 'zona', 'area', 'municipio', 'city', 'ciudad', 'localidad', 'provincia'],
  address: ['direccion', 'address', 'calle', 'street'],
  propertyType: ['tipo', 'type', 'tipologia', 'category', 'categoria'],
  url: ['url', 'link', 'enlace', 'web'],
  images: ['imagen', 'imagenes', 'image', 'images', 'fotos', 'photos', 'foto', 'photo'],
  status: ['estado', 'status', 'situacion', 'activo'],
};

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function detectMapping(headers) {
  const mapping = {};
  const normHeaders = headers.map(normalize);
  for (const [field, syns] of Object.entries(SYNONYMS)) {
    for (let i = 0; i < normHeaders.length; i++) {
      const h = normHeaders[i];
      if (syns.some((s) => h === s || h.includes(s))) {
        if (!(field in mapping)) {
          mapping[field] = headers[i];
        }
      }
    }
  }
  return mapping;
}

function parsePrice(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/[^\d.,]/g, '');
  if (!s) return null;
  // Heuristic: if both . and , appear, the rightmost is decimal — but Spanish
  // exports rarely include decimals for sale prices. Strip both for safety.
  const cleaned = s.replace(/[.,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function inferType(raw) {
  const t = normalize(raw);
  if (!t) return 'other';
  if (/finca|rustic/.test(t)) return 'finca';
  if (/terreno|solar|parcela|plot|land/.test(t)) return 'land';
  if (/chalet|casa|villa|house|adosad|pareado|unifamiliar/.test(t)) return 'house';
  if (/piso|apartamento|apartment|flat|atico|duplex|estudio|studio/.test(t)) return 'apartment';
  if (/local|oficin|office|nave|industri|comerc|hotel|edificio|negocio|shop|warehouse/.test(t)) return 'commercial';
  return 'other';
}

function inferSource(url) {
  if (!url) return 'manual';
  if (/idealista\.com/i.test(url)) return 'idealista';
  if (/fotocasa\.es/i.test(url)) return 'fotocasa';
  return 'manual';
}

function splitImages(raw) {
  if (!raw) return [];
  // Common separators: ";" "|" "," or whitespace between URLs
  return String(raw)
    .split(/[;,|\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .slice(0, 10);
}

function parseStatus(raw) {
  const t = normalize(raw);
  if (!t) return 'active';
  if (/baja|inactiv|vendido|alquilado|retirado|cerrado|off|sold|rented|closed/.test(t)) return 'off_market';
  return 'active';
}

/**
 * Parse a CSV file buffer into a list of Listing-shaped objects.
 *
 * @param {Buffer|string} input
 * @returns {{
 *   ok: boolean,
 *   listings?: Array<object>,
 *   skipped?: number,
 *   mapping?: object,
 *   error?: string,
 *   message?: string,
 * }}
 */
export function parseListingsCsv(input) {
  let rows;
  try {
    rows = parse(input, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
      // csv-parse auto-detects delimiter when not set in newer versions; force trying a few:
      delimiter: detectDelimiter(input),
    });
  } catch (err) {
    return { ok: false, error: 'parse_failed', message: err.message };
  }

  if (!rows || rows.length === 0) {
    return { ok: false, error: 'empty', message: 'El CSV no tiene filas.' };
  }

  const headers = Object.keys(rows[0]);
  const mapping = detectMapping(headers);

  if (!mapping.externalId && !mapping.url) {
    return {
      ok: false,
      error: 'no_id_column',
      message: 'No se encontró columna de referencia/URL. Esperado: Referencia, Ref, ID, o URL.',
      mapping,
      headers,
    };
  }

  const listings = [];
  let skipped = 0;

  for (const row of rows) {
    const externalId = mapping.externalId ? String(row[mapping.externalId] || '').trim() : null;
    const url = mapping.url ? String(row[mapping.url] || '').trim() : null;

    // Need at least an externalId — fall back to extracting from URL if needed.
    let id = externalId;
    if (!id && url) {
      const m = url.match(/\/(\d{5,})\/?(?:$|\?|#)/);
      if (m) id = m[1];
    }
    if (!id) {
      skipped++;
      continue;
    }

    const source = inferSource(url);
    const title = mapping.title ? String(row[mapping.title] || '').trim() : '';
    const description = mapping.description ? String(row[mapping.description] || '').trim().slice(0, 2000) : null;
    const price = mapping.price ? parsePrice(row[mapping.price]) : null;
    const location = mapping.location ? String(row[mapping.location] || '').trim() || null : null;
    const address = mapping.address ? String(row[mapping.address] || '').trim() || null : null;
    const propertyType = mapping.propertyType
      ? inferType(row[mapping.propertyType])
      : inferType(`${title} ${description || ''}`);
    const images = mapping.images ? splitImages(row[mapping.images]) : [];
    const status = mapping.status ? parseStatus(row[mapping.status]) : 'active';

    listings.push({
      source,
      externalId: id,
      title: title || `Inmueble ${id}`,
      description: description || null,
      price,
      location,
      address,
      propertyType,
      images,
      url: url || null,
      status,
    });
  }

  return { ok: true, listings, skipped, mapping };
}

function detectDelimiter(input) {
  // Sample first line to guess delimiter. csv-parse defaults to comma, but
  // many Spanish exports use semicolons (because comma is the decimal sep).
  const sample = (typeof input === 'string' ? input : input.toString('utf8')).slice(0, 4096).split(/\r?\n/)[0] || '';
  const counts = {
    ',': (sample.match(/,/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
    '|': (sample.match(/\|/g) || []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ',';
}
