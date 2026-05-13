import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { parseInboundLeadEmail } from '../services/emailParser.js';

const router = Router();

// SendGrid posts as multipart/form-data. We don't care about attachments yet, so use memory storage and ignore files.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /webhooks/sendgrid/inbound
// SendGrid Inbound Parse fields: to, from, subject, text, html, headers, envelope, ...
router.post('/sendgrid/inbound', upload.any(), async (req, res) => {
  try {
    const payload = {
      to: req.body.to,
      from: req.body.from,
      replyTo: req.body.reply_to || req.body['reply-to'] || null,
      subject: req.body.subject,
      text: req.body.text,
      html: req.body.html,
    };

    const parsed = parseInboundLeadEmail(payload);
    if (!parsed.recipient) {
      return res.status(200).json({ ok: true, ignored: 'no_recipient' });
    }

    const agent = await prisma.agent.findUnique({ where: { inboundEmailAddress: parsed.recipient } });
    if (!agent) {
      // SendGrid will retry on non-2xx. We can't process unknown recipients, so 200-and-drop.
      return res.status(200).json({ ok: true, ignored: 'unknown_recipient' });
    }

    let listingId = null;
    if (parsed.listingRef?.externalId) {
      const listing = await prisma.listing.findFirst({
        where: {
          agentId: agent.id,
          externalId: parsed.listingRef.externalId,
          ...(parsed.listingRef.source ? { source: parsed.listingRef.source } : {}),
        },
        select: { id: true },
      });
      if (listing) listingId = listing.id;
    }

    const lead = await prisma.lead.create({
      data: {
        agentId: agent.id,
        listingId,
        name: parsed.lead.name,
        email: parsed.lead.email,
        phone: parsed.lead.phone,
        source: parsed.source,
        status: 'new',
        lastActivityAt: new Date(),
        messages: {
          create: {
            agentId: agent.id,
            direction: 'inbound',
            channel: 'email',
            subject: parsed.message.subject,
            body: parsed.message.body,
          },
        },
      },
      include: { messages: true },
    });

    res.status(200).json({ ok: true, leadId: lead.id });
  } catch (err) {
    console.error('[webhook] sendgrid inbound failed', err);
    // Return 200 so SendGrid doesn't pile up retries on a malformed message; we've logged it.
    res.status(200).json({ ok: false, error: 'internal_error' });
  }
});

export default router;
