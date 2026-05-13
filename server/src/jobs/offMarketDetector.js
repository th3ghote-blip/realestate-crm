// Periodically checks each active listing's URL and flips it to off_market
// when the source page is gone (404/410) or shows the standard "no longer
// available" markers. When a listing transitions, every linked open lead
// gets a notification + an automatic "this property is no longer available,
// here are similar options" email.
//
// Runs in-process on a setInterval. Single-instance Railway deploys are
// fine for v1; multi-instance would need a job queue lock.

import { prisma } from '../db.js';
import { fetchHtml } from '../services/scraper/http.js';
import { sendEmail } from '../services/emailSender.js';

const CHECK_EVERY_MS = Number(process.env.OFF_MARKET_CHECK_INTERVAL_MS) || 6 * 60 * 60 * 1000; // 6h
const STALE_AFTER_MS = Number(process.env.OFF_MARKET_STALE_MS) || 6 * 60 * 60 * 1000;
const BATCH_SIZE = 25; // how many listings to check per tick — keep small to avoid bot walls

const OFF_MARKET_MARKERS = [
  /anuncio (?:no )?(?:est[aá]|ha sido) (?:eliminado|retirado|dado de baja)/i,
  /este anuncio ya no est[aá] disponible/i,
  /listing (?:has been )?removed/i,
  /this property is no longer available/i,
  /404\s+not\s+found/i,
];

const OPEN_STATUSES = ['new', 'contacted', 'qualified', 'viewing', 'offer'];

let timer = null;
let running = false;

export function startOffMarketDetector() {
  if (timer) return;
  timer = setInterval(() => {
    runOnce().catch((err) => console.error('[offMarket] tick failed', err));
  }, CHECK_EVERY_MS);
  // Fire one tick a minute after boot so a fresh deploy starts checking quickly.
  setTimeout(() => runOnce().catch((e) => console.error('[offMarket] initial tick failed', e)), 60 * 1000);
}

export async function runOnce() {
  if (running) return { skipped: 'already_running' };
  running = true;
  try {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);
    const listings = await prisma.listing.findMany({
      where: {
        status: 'active',
        url: { not: null },
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: cutoff } }],
      },
      orderBy: { lastCheckedAt: { sort: 'asc', nulls: 'first' } },
      take: BATCH_SIZE,
    });

    const results = { checked: 0, transitioned: 0, notified: 0 };
    for (const listing of listings) {
      results.checked++;
      try {
        const wentOff = await checkListing(listing);
        if (wentOff) {
          results.transitioned++;
          results.notified += await onTransitionOff(listing);
        }
      } catch (err) {
        console.error('[offMarket] check failed', listing.id, err.message);
      }
    }
    return results;
  } finally {
    running = false;
  }
}

async function checkListing(listing) {
  const { status, html } = await fetchHtml(listing.url, { timeoutMs: 12000 });

  // 404/410 → definitely gone.
  if (status === 404 || status === 410) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: 'off_market', lastCheckedAt: new Date() },
    });
    return true;
  }

  // 403/429 → bot wall fired; don't change state, just bump lastCheckedAt
  // so we don't hammer the same blocked URL every tick.
  if (status === 403 || status === 429) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { lastCheckedAt: new Date() },
    });
    return false;
  }

  if (status >= 200 && status < 300) {
    const isOff = OFF_MARKET_MARKERS.some((rx) => rx.test(html));
    await prisma.listing.update({
      where: { id: listing.id },
      data: { status: isOff ? 'off_market' : 'active', lastCheckedAt: new Date() },
    });
    return isOff;
  }

  // 5xx, redirects to homepage, etc — leave alone, retry next tick.
  await prisma.listing.update({
    where: { id: listing.id },
    data: { lastCheckedAt: new Date() },
  });
  return false;
}

async function onTransitionOff(listing) {
  const leads = await prisma.lead.findMany({
    where: {
      listingId: listing.id,
      status: { in: OPEN_STATUSES },
    },
    include: { agent: true },
  });

  let notified = 0;
  for (const lead of leads) {
    await prisma.notification.create({
      data: {
        agentId: lead.agentId,
        leadId: lead.id,
        listingId: listing.id,
        type: 'off_market',
        message: `El inmueble "${listing.title}" ha pasado a fuera de mercado. Lead afectado: ${lead.name}.`,
      },
    });
    notified++;

    if (lead.email) {
      const text = `Hola ${lead.name?.split(' ')[0] || ''},\n\n` +
        `El inmueble por el que preguntaste ("${listing.title}") ya no está disponible. ` +
        `Estamos buscando opciones similares para ti — te avisaremos en breve.\n\n` +
        `Un saludo,\n${lead.agent.name}`;
      const result = await sendEmail({
        to: lead.email,
        replyTo: lead.agent.inboundEmailAddress,
        fromName: lead.agent.name,
        subject: `Sobre tu consulta: ${listing.title}`,
        text,
      });
      await prisma.message.create({
        data: {
          leadId: lead.id,
          agentId: lead.agentId,
          direction: 'outbound',
          channel: 'email',
          subject: `Sobre tu consulta: ${listing.title}`,
          body: text,
        },
      });
      if (!result.ok) {
        console.warn('[offMarket] auto-email failed', lead.id, result.error);
      }
    }
  }
  return notified;
}
