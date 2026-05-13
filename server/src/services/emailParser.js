// Parser for forwarded Idealista / Fotocasa lead emails.
//
// These portals format leads predictably but the templates have shifted over the years
// and Spanish agents commonly *forward* them, which means the original body sits
// inside a wrapper (Gmail/Outlook quote prefixes etc). The parser is intentionally
// lenient: it extracts name / email / phone / message / property reference from
// whatever shape arrives, and falls back to source=direct if nothing matches.

const IDEALISTA_HINTS = [/idealista\.com/i, /idealista\.it/i, /idealista\.pt/i, /\bIdealista\b/];
const FOTOCASA_HINTS = [/fotocasa\.es/i, /\bFotocasa\b/];

const EMAIL_RX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Spanish phones — supports +34, 34, leading 6/7/8/9, with spaces/dashes
const PHONE_RX = /(?:\+?34[\s.-]?)?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/;

// Property reference patterns
const IDEALISTA_LISTING_URL_RX = /https?:\/\/(?:www\.)?idealista\.com\/(?:[a-z]{2}\/)?inmueble\/(\d+)/i;
const FOTOCASA_LISTING_URL_RX = /https?:\/\/(?:www\.)?fotocasa\.es\/[^\s)>"]+\/(\d{6,})/i;
const REFERENCE_RX = /\b(?:Referencia|Ref(?:erence)?\.?)\s*[:#]?\s*([A-Z0-9-]{3,})/i;

function detectSource(payload) {
  const haystack = `${payload.subject || ''}\n${payload.from || ''}\n${payload.text || ''}\n${payload.html || ''}`;
  if (IDEALISTA_HINTS.some((rx) => rx.test(haystack))) return 'idealista';
  if (FOTOCASA_HINTS.some((rx) => rx.test(haystack))) return 'fotocasa';
  return 'direct';
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractName(text, leadEmail) {
  // Common templates: "Nombre: Juan Perez", "Name: Juan Perez", "De: Juan Perez <...>"
  const labeled = text.match(/(?:Nombre|Name|De|From)\s*[:]\s*([^\n<]{2,80})/i);
  if (labeled) {
    const candidate = labeled[1].trim().replace(/[<].*$/, '').trim();
    if (candidate && !EMAIL_RX.test(candidate)) return candidate;
  }
  // Sometimes the body opens "Hola, soy Juan Perez y..."
  const intro = text.match(/(?:soy|me llamo|my name is)\s+([A-Z][\p{L}'.-]+(?:\s+[A-Z][\p{L}'.-]+){0,3})/iu);
  if (intro) return intro[1].trim();
  // Last resort: prefix of email
  if (leadEmail) return leadEmail.split('@')[0].replace(/[._-]+/g, ' ');
  return 'Lead sin nombre';
}

function extractFromAddress(payload) {
  // SendGrid forwards the *forwarder's* From, so prefer Reply-To / body content.
  const headerEmail = (payload.replyTo || '').match(EMAIL_RX)?.[0]
    || (payload.from || '').match(EMAIL_RX)?.[0];
  return headerEmail || null;
}

function extractListingRef(text) {
  const idealistaUrl = text.match(IDEALISTA_LISTING_URL_RX);
  if (idealistaUrl) return { source: 'idealista', externalId: idealistaUrl[1], url: idealistaUrl[0] };

  const fotocasaUrl = text.match(FOTOCASA_LISTING_URL_RX);
  if (fotocasaUrl) return { source: 'fotocasa', externalId: fotocasaUrl[1], url: fotocasaUrl[0] };

  const ref = text.match(REFERENCE_RX);
  if (ref) return { source: null, externalId: ref[1], url: null };

  return null;
}

function extractMessageBody(text) {
  // Try to slice from "Mensaje:" / "Message:" markers used by both portals.
  const marker = text.match(/(?:Mensaje|Message|Comentarios?)\s*[:]\s*([\s\S]+?)(?:\n\s*(?:Referencia|Ref\.|Tel[ée]fono|Phone|Email|Saludos|--\s*\n)|\z)/i);
  if (marker) return marker[1].trim().slice(0, 4000);
  // Fall back to whole body, capped.
  return text.trim().slice(0, 4000);
}

/**
 * Parse a normalized inbound email payload.
 * @param {{to: string, from?: string, replyTo?: string, subject?: string, text?: string, html?: string}} payload
 * @returns {{
 *   recipient: string,
 *   source: 'idealista'|'fotocasa'|'direct',
 *   lead: { name: string, email: string|null, phone: string|null },
 *   message: { subject: string|null, body: string },
 *   listingRef: { source: 'idealista'|'fotocasa'|null, externalId: string, url: string|null } | null,
 * }}
 */
export function parseInboundLeadEmail(payload) {
  const recipient = (payload.to || '').match(EMAIL_RX)?.[0]?.toLowerCase() || '';
  const source = detectSource(payload);

  const text = payload.text && payload.text.trim().length > 0
    ? payload.text
    : stripHtml(payload.html || '');

  const leadEmail = extractFromAddress(payload) || text.match(EMAIL_RX)?.[0] || null;
  const phoneMatch = text.match(PHONE_RX);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s.-]/g, '') : null;
  const name = extractName(text, leadEmail);
  const body = extractMessageBody(text);
  const listingRef = extractListingRef(text);

  return {
    recipient,
    source,
    lead: { name, email: leadEmail, phone },
    message: { subject: payload.subject || null, body },
    listingRef,
  };
}
