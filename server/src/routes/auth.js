import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function mintInboundAddress() {
  const domain = process.env.APP_INBOUND_DOMAIN || 'inbound.localhost';
  // Short prefix is fine — uuid collisions are astronomically unlikely, but we still rely on the @@unique constraint.
  return `agent-${randomUUID()}@${domain}`;
}

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.agent.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'email_taken' });

  const passwordHash = await bcrypt.hash(password, 10);

  const agent = await prisma.agent.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      inboundEmailAddress: mintInboundAddress(),
    },
  });

  const token = signToken(agent.id);
  res.status(201).json({ token, agent: publicAgent(agent) });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const { email, password } = parsed.data;

  const agent = await prisma.agent.findUnique({ where: { email } });
  if (!agent) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, agent.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signToken(agent.id);
  res.json({ token, agent: publicAgent(agent) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ agent: publicAgent(req.agent) });
});

function publicAgent(agent) {
  return {
    id: agent.id,
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    inboundEmailAddress: agent.inboundEmailAddress,
    idealistaProfileUrl: agent.idealistaProfileUrl,
    fotocasaProfileUrl: agent.fotocasaProfileUrl,
    createdAt: agent.createdAt,
  };
}

export default router;
