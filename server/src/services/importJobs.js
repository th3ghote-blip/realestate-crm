// In-memory tracker for portfolio import jobs.
//
// We keep this in-process for v1 — fine for a single-instance Railway deploy.
// When we add horizontal scaling, swap this for a Postgres table or Redis.

import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import { scrapeProfile, detectPortal } from './scraper/index.js';

const jobs = new Map(); // jobId -> { agentId, portal, profileUrl, status, total, imported, log, error, finishedAt }

function snapshot(job) {
  if (!job) return null;
  return {
    id: job.id,
    portal: job.portal,
    profileUrl: job.profileUrl,
    status: job.status,
    total: job.total,
    imported: job.imported,
    error: job.error || null,
    message: job.message || null,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt || null,
  };
}

export function getJob(jobId, agentId) {
  const job = jobs.get(jobId);
  if (!job || job.agentId !== agentId) return null;
  return snapshot(job);
}

export function listAgentJobs(agentId, limit = 5) {
  return [...jobs.values()]
    .filter((j) => j.agentId === agentId)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
    .map(snapshot);
}

/** Kick off a scrape+save job. Returns the initial snapshot immediately. */
export function startImport({ agentId, profileUrl }) {
  const portal = detectPortal(profileUrl);
  const id = randomUUID();
  const job = {
    id,
    agentId,
    portal,
    profileUrl,
    status: portal ? 'running' : 'failed',
    total: 0,
    imported: 0,
    error: portal ? null : 'unsupported_portal',
    message: portal ? null : 'URL no soportada. Usa Idealista Pro o Fotocasa.',
    startedAt: Date.now(),
    finishedAt: portal ? null : Date.now(),
  };
  jobs.set(id, job);

  if (portal) runJob(job).catch((err) => {
    job.status = 'failed';
    job.error = 'internal_error';
    job.message = err.message;
    job.finishedAt = Date.now();
  });

  return snapshot(job);
}

async function runJob(job) {
  const result = await scrapeProfile(job.profileUrl, {
    logger: (ev) => {
      if (ev.kind === 'page_done') {
        job.total = ev.total;
      }
    },
  });

  if (!result.ok) {
    job.status = 'failed';
    job.error = result.error;
    job.message = result.message || null;
    job.finishedAt = Date.now();
    // If we got partial results before the block, persist them anyway.
    if (Array.isArray(result.partial) && result.partial.length > 0) {
      await persistListings(job.agentId, result.partial, job);
    }
    return;
  }

  await persistListings(job.agentId, result.listings, job);

  // Save the profile URL on the agent so the UI can show "Reconnect" instead of "Connect".
  const field = job.portal === 'idealista' ? 'idealistaProfileUrl' : 'fotocasaProfileUrl';
  await prisma.agent.update({
    where: { id: job.agentId },
    data: { [field]: job.profileUrl },
  });

  job.status = 'completed';
  job.finishedAt = Date.now();
}

async function persistListings(agentId, listings, job) {
  for (const l of listings) {
    try {
      await prisma.listing.upsert({
        where: {
          agentId_source_externalId: { agentId, source: l.source, externalId: l.externalId },
        },
        update: {
          title: l.title,
          description: l.description,
          price: l.price,
          location: l.location,
          address: l.address,
          propertyType: l.propertyType,
          images: l.images,
          url: l.url,
          status: 'active',
          lastCheckedAt: new Date(),
        },
        create: {
          agentId,
          source: l.source,
          externalId: l.externalId,
          title: l.title,
          description: l.description,
          price: l.price,
          location: l.location,
          address: l.address,
          propertyType: l.propertyType,
          images: l.images,
          url: l.url,
          status: 'active',
          lastCheckedAt: new Date(),
        },
      });
      job.imported++;
    } catch (err) {
      // One bad row shouldn't kill the whole import.
      console.error('[import] failed to persist listing', l.externalId, err.message);
    }
  }
}
