import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { composeWaLink, defaultGreeting } from '../services/whatsapp.js';
import { sendEmail } from '../services/emailSender.js';

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

// GET /api/leads/:id — full detail with conversation thread + suggested WhatsApp link
router.get('/:id', async (req, res) => {
  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, agentId: req.agent.id },
    include: {
      listing: true,
      messages: { orderBy: { sentAt: 'asc' } },
    },
  });
  if (!lead) return res.status(404).json({ error: 'not_found' });

  const suggestedMessage = defaultGreeting({
    agentName: req.agent.name,
    leadName: lead.name,
    listingTitle: lead.listing?.title,
    listingUrl: lead.listing?.url,
  });
  const waLink = composeWaLink({ phone: lead.phone, message: suggestedMessage });

  res.json({
    lead,
    waLink,
    suggestedMessage,
  });
});

// PATCH /api/leads/:id — update status, financing, notes, qualification
const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'viewing', 'offer', 'closed', 'lost']).optional(),
  financingType: z.enum(['unknown', 'mortgage', 'cash']).optional(),
  qualificationStatus: z.enum(['unqualified', 'in_progress', 'qualified', 'disqualified']).optional(),
  notes: z.string().max(8000).nullable().optional(),
});
router.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const existing = await prisma.lead.findFirst({
    where: { id: req.params.id, agentId: req.agent.id },
    select: { id: true, status: true },
  });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const updated = await prisma.lead.update({
    where: { id: existing.id },
    data: { ...parsed.data, lastActivityAt: new Date() },
  });
  res.json({ lead: updated });
});

// POST /api/leads/:id/messages — log an outbound message; optionally send via SendGrid
const messageSchema = z.object({
  channel: z.enum(['email', 'whatsapp_link', 'whatsapp']),
  body: z.string().min(1).max(8000),
  subject: z.string().max(200).optional(),
});
router.post('/:id/messages', async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, agentId: req.agent.id },
    include: { listing: { select: { title: true } } },
  });
  if (!lead) return res.status(404).json({ error: 'not_found' });

  let deliveryStatus = 'logged_only';
  let deliveryError = null;

  if (parsed.data.channel === 'email' && lead.email) {
    const result = await sendEmail({
      to: lead.email,
      replyTo: req.agent.inboundEmailAddress,
      fromName: req.agent.name,
      subject: parsed.data.subject || (lead.listing?.title ? `Re: ${lead.listing.title}` : 'Tu consulta inmobiliaria'),
      text: parsed.data.body,
    });
    deliveryStatus = result.ok ? 'sent' : 'failed';
    deliveryError = result.ok ? null : result.error;
  }

  const message = await prisma.message.create({
    data: {
      leadId: lead.id,
      agentId: req.agent.id,
      direction: 'outbound',
      channel: parsed.data.channel,
      subject: parsed.data.subject || null,
      body: parsed.data.body,
    },
  });

  // Bump activity timestamp + auto-advance status if still 'new'
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      lastActivityAt: new Date(),
      ...(lead.status === 'new' ? { status: 'contacted' } : {}),
    },
  });

  res.status(201).json({ message, delivery: { status: deliveryStatus, error: deliveryError } });
});

export default router;
