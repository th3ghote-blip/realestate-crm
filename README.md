# Real Estate CRM — Spain (Idealista/Fotocasa)

WhatsApp-first, Idealista-native CRM for Spanish real estate agents.
Forward Idealista/Fotocasa lead emails to a unique inbox address, upload
your portfolio as CSV (or wait for the Idealista API), and you're operational
in 2 minutes.

## Stack

- **Frontend**: React + Vite + Tailwind (mobile-first, Spanish UI)
- **Backend**: Node.js (ESM) + Express
- **Database**: PostgreSQL (Prisma)
- **Inbound email**: SendGrid Inbound Parse → `/webhooks/sendgrid/inbound`
- **Outbound email**: SendGrid v3 (optional — without keys, messages are logged in-thread)
- **WhatsApp**: `wa.me` links (phase 1), Twilio (phase 2)
- **Hosting**: Railway (single service, server serves the built client)

## Layout

```
/server          Node/Express API, Prisma schema, background jobs
/client          Vite/React/Tailwind frontend
/server/prisma   schema.prisma + migrations
```

## Local dev

```bash
# 1. Postgres running locally (or use a Railway connection string)
cd server
cp .env.example .env       # fill DATABASE_URL, JWT_SECRET, APP_INBOUND_DOMAIN
npm install
npx prisma migrate dev
npm run dev                # localhost:4000

# 2. Frontend
cd ../client
npm install
npm run dev                # localhost:5173 (proxies /api to :4000)
```

## Deploy to Railway

1. Create a new Railway project, add a **PostgreSQL** plugin — it sets `DATABASE_URL` automatically.
2. Add a **service from this GitHub repo**. Railway will detect `railway.toml` and run `npm run build` then `npm start`.
3. Set environment variables on the service:
   - `JWT_SECRET` — long random string
   - `APP_INBOUND_DOMAIN` — e.g. `inbound.yourapp.com`
   - `CORS_ORIGIN` — your Railway public domain
   - *(optional)* `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` — to actually send outbound email
   - *(optional)* `OFF_MARKET_CHECK_INTERVAL_MS`, `OFF_MARKET_STALE_MS` — defaults are 6h
4. **Inbound email** — at SendGrid: Settings → Inbound Parse → add `inbound.yourapp.com` → POST URL `https://<your-railway-domain>/webhooks/sendgrid/inbound`. Point an MX record at `mx.sendgrid.net` on that subdomain.

The server serves the built client from `/client/dist` in production. SPA routes fall through to `index.html`.

## How it works

1. Agent signs up → unique `agent-<uuid>@inbound.yourapp.com` is minted and shown in the inbox.
2. Agent forwards Idealista/Fotocasa lead emails to that address → SendGrid Inbound Parse → webhook → email parser → Lead + Message created → appears in inbox immediately.
3. Agent uploads a CSV of their portfolio from the pro dashboard → listings appear in `/listings`, can be flagged as financing-eligible-or-not.
4. When a new lead arrives on a listing flagged `financingEligible: false`, the system auto-emails the lead a qualification question and surfaces a notification.
5. A background job checks each listing's URL every 6h. If it 404s or shows a "no longer available" marker, the listing flips to off-market and every open lead linked to it is notified by email + in-app.
6. Pipeline, lead detail, WhatsApp `wa.me` composer, auto-saving notes, and a dashboard with rolling counts + follow-up reminders complete the loop.

## Roadmap

- [x] **1.1** Auth + inbound email + inbox
- [x] **2** Portfolio scraper (Idealista/Fotocasa — blocked by DataDome, kept as code)
- [x] **2.5** CSV upload (primary import path until API approved)
- [x] **3** Lead detail + pipeline + WhatsApp composer + outbound messages
- [x] **4** Off-market detector cron + auto-notify
- [x] **5** Financing qualification auto-email
- [x] **6** Dashboard
- [x] **Deploy** Railway config + production static-serve
- [ ] **Phase 2** Twilio WhatsApp API, AI-suggested replies, multi-agent, Idealista official API
