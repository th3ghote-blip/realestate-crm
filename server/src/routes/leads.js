import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// GET /api/leads — inbox: all leads for current agent, most recent activity first
router.get('/', async (req, res) => {
  const leads = await prisma.lead.findMany({
    where: { agentId: req.agent.id },
    orderBy: { lastActivityAt: 'desc' },
    include: {
      listing: { select: { id: true, title: true, price: true, images: true, url: true, financingEligible: true, status: true } },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1,
        select: { id: true, body: true, sentAt: true, direction: true, channel: true },
      },
    },
  });

  res.json({
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      source: l.source,
      status: l.status,
      financingType: l.financingType,
      qualificationStatus: l.qualificationStatus,
      notes: l.notes,
      lastActivityAt: l.lastActivityAt,
      createdAt: l.createdAt,
      listing: l.listing,
      lastMessage: l.messages[0] || null,
    })),
  });
});

// GET /api/leads/:id — full detail with conversation thread
router.get('/:id', async (req, res) => {
  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, agentId: req.agent.id },
    include: {
      listing: true,
      messages: { orderBy: { sentAt: 'asc' } },
    },
  });
  if (!lead) return res.status(404).json({ error: 'not_found' });
  res.json({ lead });
});

export default router;
