import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const agent = await prisma.agent.findUnique({ where: { id: payload.sub } });
    if (!agent) return res.status(401).json({ error: 'invalid_token' });
    req.agent = agent;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

export function signToken(agentId) {
  return jwt.sign({ sub: agentId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}
