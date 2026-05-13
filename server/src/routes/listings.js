import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { startImport, getJob, listAgentJobs, importCsv } from '../services/importJobs.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.use(requireAuth);

// GET /api/listings — current agent's portfolio
router.get('/', async (req, res) => {
  const listings = await prisma.listing.findMany({
    where: { agentId: req.agent.id },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ listings });
});

// PATCH /api/listings/:id — toggle financing_eligible, edit metadata
const patchSchema = z.object({
  financingEligible: z.boolean().optional(),
  status: z.enum(['active', 'off_market']).optional(),
});
router.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const existing = await prisma.listing.findFirst({
    where: { id: req.params.id, agentId: req.agent.id },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const updated = await prisma.listing.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  res.json({ listing: updated });
});

// POST /api/listings/import — kick off a profile scrape
const importSchema = z.object({
  profileUrl: z.string().min(10).max(500),
});
router.post('/import', async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const job = startImport({ agentId: req.agent.id, profileUrl: parsed.data.profileUrl.trim() });
  res.status(202).json({ job });
});

// GET /api/listings/import/:jobId — poll job status
router.get('/import/:jobId', (req, res) => {
  const job = getJob(req.params.jobId, req.agent.id);
  if (!job) return res.status(404).json({ error: 'not_found' });
  res.json({ job });
});

// GET /api/listings/import — recent jobs (for showing "last import" state)
router.get('/import', (req, res) => {
  res.json({ jobs: listAgentJobs(req.agent.id) });
});

// POST /api/listings/import/csv — multipart upload of a portfolio CSV
router.post('/import/csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const result = await importCsv({ agentId: req.agent.id, buffer: req.file.buffer });
  if (!result.ok) return res.status(400).json(result);
  res.status(201).json(result);
});

export default router;
