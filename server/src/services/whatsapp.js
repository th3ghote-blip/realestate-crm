// WhatsApp wa.me link composer. Used server-side when seeding the default reply
// for an inbound lead, and re-used client-side via /api/leads/:id which echoes
// the suggested text. Phase 2 swaps to Twilio WhatsApp API.

const COUNTRY_CODE_FALLBACK = '34'; // Spain

export function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  // Already international (10-15 digits)
  if (digits.length >= 11) return digits;
  // 9-digit local Spanish number
  if (digits.length === 9) return `${COUNTRY_CODE_FALLBACK}${digits}`;
  return digits;
}

export function composeWaLink({ phone, message }) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${text}`;
}

export function defaultGreeting({ agentName, leadName, listingTitle, listingUrl }) {
  const greet = leadName ? `Hola ${leadName.split(' ')[0]}` : 'Hola';
  const property = listingTitle ? ` sobre el inmueble "${listingTitle}"` : '';
  const link = listingUrl ? ` (${listingUrl})` : '';
  const sign = agentName ? `\n\nUn saludo,\n${agentName}` : '';
  return `${greet}, soy ${agentName || 'el agente'} y te escribo${property}${link}. ¿Cuándo te vendría bien una llamada o visita?${sign}`;
}
