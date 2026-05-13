import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/notifications — pending notifications for current agent
router.get('/', async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { agentId: req.agent.id, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    include: {
      lead: { select: { id: true, name: true } },
      listing: { select: { id: true, title: true, images: true } },
    },
    take: 50,
  });
  res.json({ notifications: items });
});

// GET /api/notifications/count — pending count, used for the inbox badge
router.get('/count', async (req, res) => {
  const count = await prisma.notification.count({
    where: { agentId: req.agent.id, status: 'pending' },
  });
  res.json({ count });
});

const patchSchema = z.object({
  status: z.enum(['dismissed', 'sent']),
});

router.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const existing = await prisma.notification.findFirst({
    where: { id: req.params.id, agentId: req.agent.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const updated = await prisma.notification.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  res.json({ notification: updated });
});

router.post('/dismiss-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: { agentId: req.agent.id, status: 'pending' },
    data: { status: 'dismissed' },
  });
  res.json({ ok: true });
});

export default router;
