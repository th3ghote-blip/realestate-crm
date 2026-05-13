import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import leadsRouter from './routes/leads.js';
import listingsRouter from './routes/listings.js';
import notificationsRouter from './routes/notifications.js';
import webhooksRouter from './routes/webhooks.js';
import { startOffMarketDetector } from './jobs/offMarketDetector.js';

const app = express();

const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/webhooks', webhooksRouter);

app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ error: 'internal_error' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`[server] listening on :${port}`);
  if (process.env.JOBS_ENABLED !== 'false') {
    startOffMarketDetector();
    console.log('[server] off-market detector scheduled');
  }
});
