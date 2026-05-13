# Real Estate CRM — Spain (Idealista/Fotocasa)

WhatsApp-first, Idealista-native CRM for Spanish real estate agents.

## Stack

- **Frontend**: React + Vite + Tailwind
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Prisma ORM)
- **Email inbound**: SendGrid Inbound Parse
- **Hosting**: Railway

## Layout

```
/server         Node/Express API + Prisma schema + background jobs
/client         React + Vite + Tailwind frontend
```

## Local dev

```bash
# 1. Postgres running locally (or use Railway connection string)
# 2. Server
cd server
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, APP_INBOUND_DOMAIN
npm install
npx prisma migrate dev
npm run dev

# 3. Client
cd client
npm install
npm run dev
```

## SendGrid Inbound Parse setup (production)

1. Point an MX record for your inbound subdomain (e.g. `inbound.yourapp.com`) at `mx.sendgrid.net`.
2. In SendGrid: Settings → Inbound Parse → Add Host & URL → host `inbound.yourapp.com` → POST URL `https://your-api.com/webhooks/sendgrid/inbound`.
3. Each agent gets a unique address `agent-<uuid>@inbound.yourapp.com` assigned on signup. The webhook routes incoming mail by the `To:` address.

## Roadmap

- [x] Phase 1.1 — Auth + inbound email assignment + basic inbox
- [ ] Phase 1.2 — Listing import scraper (Idealista/Fotocasa)
- [ ] Phase 1.3 — Lead detail + pipeline + WhatsApp link composer
- [ ] Phase 1.4 — Off-market detector + auto-notify
- [ ] Phase 1.5 — Financing qualification flag
- [ ] Phase 1.6 — Dashboard
- [ ] Phase 2 — Twilio WhatsApp API, AI suggested replies, multi-agent
