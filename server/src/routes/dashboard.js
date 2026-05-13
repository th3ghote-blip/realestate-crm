import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard — counts + pipeline overview + follow-up reminders + recent activity
router.get('/', async (req, res) => {
  const agentId = req.agent.id;
  const now = new Date();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const followUpCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [
    leadsByStatus,
    leadsThisWeek,
    leadsThisMonth,
    listingsActive,
    listingsOffMarket,
    followUps,
    recentActivity,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ['status'],
      where: { agentId },
      _count: { _all: true },
    }),
    prisma.lead.count({ where: { agentId, createdAt: { gte: startOfWeek } } }),
    prisma.lead.count({ where: { agentId, createdAt: { gte: startOfMonth } } }),
    prisma.listing.count({ where: { agentId, status: 'active' } }),
    prisma.listing.count({ where: { agentId, status: 'off_market' } }),
    prisma.lead.findMany({
      where: {
        agentId,
        status: { in: ['new', 'contacted', 'qualified', 'viewing'] },
        lastActivityAt: { lt: followUpCutoff },
      },
      orderBy: { lastActivityAt: 'asc' },
      take: 10,
      include: { listing: { select: { title: true } } },
    }),
    prisma.message.findMany({
      where: { agentId },
      orderBy: { sentAt: 'desc' },
      take: 8,
      include: {
        lead: { select: { id: true, name: true } },
      },
    }),
  ]);

  const byStage = Object.fromEntries(leadsByStatus.map((row) => [row.status, row._count._all]));

  res.json({
    leadsThisWeek,
    leadsThisMonth,
    listingsActive,
    listingsOffMarket,
    byStage,
    followUps: followUps.map((l) => ({
      id: l.id,
      name: l.name,
      listing: l.listing?.title || null,
      status: l.status,
      lastActivityAt: l.lastActivityAt,
    })),
    recentActivity: recentActivity.map((m) => ({
      id: m.id,
      leadId: m.leadId,
      leadName: m.lead?.name || null,
      direction: m.direction,
      channel: m.channel,
      body: m.body.slice(0, 200),
      sentAt: m.sentAt,
    })),
  });
});

export default router;
