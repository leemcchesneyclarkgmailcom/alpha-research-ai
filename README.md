# Alpha Research AI

> AI-powered stock research platform that continuously analyzes public companies and automatically generates institutional-quality research reports.

[![CI](https://github.com/leemcchesneyclarkgmailcom/alpha-research-ai/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made with Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Ready-black)](https://vercel.com)

---

## ✨ Overview

**Alpha Research AI** is a production-ready SaaS that turns raw public-company
data — SEC filings, earnings releases, financial statements, and news flow —
into institutional-grade research reports. An autonomous pipeline ingests
data on a schedule, an LLM-powered research engine produces bull/bear cases,
investment theses, risk extractions, and full analyst notes, and a
Bloomberg-style dashboard surfaces everything for analysts, PMs, and
individual investors.

### Highlights

- 🧠 **Autonomous AI research engine** — earnings summaries, SEC filing
  analysis, annual report summaries, investment theses, bull/bear cases,
  risk extraction, sentiment detection, full analyst reports.
- 💬 **AI Chat Analyst** — conversational Q&A about any company, with
  institutional-grade depth and company-specific context.
- 📡 **Continuous data collection** — scheduled jobs for market prices,
  financial statements, SEC filings, company news, and insider transactions.
- 📊 **Bloomberg-style dashboard** — watchlists, portfolio tracking with
  analytics, stock screener, AI ratings, research reports, earnings calendar,
  market movers, news & sentiment, sector dashboard, insider transactions.
- 🔐 **Auth & subscriptions** — NextAuth.js with bcrypt password hashing,
  JWT sessions (serverless-ready), Free / Pro / Institutional plans with
  AI credit meters.
- 🔔 **Price alerts** — user-defined price targets, rating changes, and
  earnings alerts, checked every 5 minutes by Vercel Cron.
- 📈 **Technical analysis** — SMA-20/50, RSI, MACD, Bollinger Bands,
  52-week high/low, volume analysis, and automated trading signals.
- 🔗 **Shareable reports** — generate public links for any research report,
  valid for 90 days.
- 🌗 **Dark / light mode**, fully responsive, accessibility-first.
- ⚙️ **Vercel-ready** — Vercel Cron for autonomous operation, DB-backed
  cache and queue (no in-memory state), PostgreSQL support.

---

## 🏗️ Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, TanStack Query, Recharts, Framer Motion |
| Backend | Next.js API Routes (REST), Prisma ORM, SQLite (dev) / PostgreSQL (Vercel prod), DB-backed cache & queue |
| AI | `z-ai-web-dev-sdk` (LLM completions with retry/backoff + chat) |
| Auth | NextAuth.js v4 (JWT strategy, credentials provider, bcrypt hashing) |
| Infra | Docker, docker-compose, GitHub Actions CI/CD, Vercel Cron |

---

## 🚀 Quickstart

### Prerequisites

- Node.js ≥ 20 (or [Bun](https://bun.sh) ≥ 1.1 — recommended)
- A database (SQLite for dev, PostgreSQL for Vercel)

### Install & run locally

```bash
# 1. Clone
git clone https://github.com/leemcchesneyclarkgmailcom/alpha-research-ai.git
cd alpha-research-ai

# 2. Install dependencies
bun install

# 3. Configure environment
cp .env.example .env
# Edit .env — set NEXTAUTH_SECRET (required for auth):
#   openssl rand -base64 32

# 4. Push the database schema (auto-detects SQLite vs PostgreSQL from DATABASE_URL)
bun run db:push

# 5. Seed demo data (7 companies, prices, financials, filings, news, insiders, AI reports)
bun run seed

# 6. Start the dev server
bun run dev
```

Open <http://localhost:3000>. Use the **demo account**:

```
email:    demo@alpha-research.ai
password: demo
```

### Vercel deployment

1. **Import the repo** at <https://vercel.com/new>
2. **Set environment variables** (Vercel → Settings → Environment Variables):
   - `DATABASE_URL` — your Vercel Postgres / Neon / Supabase connection string
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://your-app.vercel.app`
   - `CRON_SECRET` — `openssl rand -hex 32` (used to authenticate cron endpoints)
3. **Deploy** — Vercel auto-detects Next.js, runs `bun run build`, and
   deploys. The `vercel.json` cron schedules take effect immediately.
4. **Push schema to production DB** — run once locally:
   ```bash
   DATABASE_URL="your-vercel-postgres-url" bun run db:push
   ```
5. **Seed production DB** (optional):
   ```bash
   DATABASE_URL="your-vercel-postgres-url" bun run seed
   ```

The Vercel Cron jobs will automatically:
- Process the job queue every minute
- Collect market prices every 15 minutes
- Ingest SEC filings hourly
- Monitor company news every 30 minutes
- Regenerate AI ratings daily at 9am
- Publish analyst reports daily at 8am
- Check user alerts every 5 minutes

---

## 📂 Repository Structure

```
alpha-research-ai/
├── docs/
│   ├── ARCHITECTURE.md
│   └── API.md
├── prisma/
│   └── schema.prisma            # 18 models — User, Company, Filing, Report, Job, Alert, Chat, Insider, ...
├── src/
│   ├── app/
│   │   ├── api/                 # 40+ REST endpoints
│   │   │   ├── auth/[...nextauth]/  # NextAuth.js handler
│   │   │   ├── auth/register/      # Registration with bcrypt
│   │   │   ├── cron/               # Vercel Cron endpoints (7 schedules)
│   │   │   ├── companies/          # CRUD + sub-resources
│   │   │   ├── chat/               # AI Chat Analyst
│   │   │   ├── compare/            # Side-by-side comparison
│   │   │   ├── alerts/             # Price/rating/earnings alerts
│   │   │   ├── technical/          # SMA, RSI, MACD, Bollinger
│   │   │   ├── insiders/           # Insider transactions
│   │   │   ├── sectors/            # Sector dashboard
│   │   │   ├── portfolio/analytics/ # Sharpe, beta, diversification
│   │   │   ├── share/              # Public report links
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── page.tsx               # Bloomberg-style single-page dashboard
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives
│   │   ├── charts/                # Price and score charts
│   │   ├── views/                 # 16 dashboard views
│   │   ├── auth-provider.tsx      # NextAuth session provider
│   │   └── ...
│   └── lib/
│       ├── ai-engine.ts           # LLM research engine
│       ├── auth-config.ts         # NextAuth config (credentials + JWT)
│       ├── collectors.ts          # Market data, filings, news, insiders
│       ├── queue.ts               # DB-backed cache + queue (serverless-safe)
│       ├── boot.ts                # Job handlers + alert checker
│       └── ...
├── scripts/
│   ├── seed.ts                   # Demo data seeder
│   └── prisma-provider.ts        # Auto-switch SQLite ↔ PostgreSQL
├── vercel.json                   # Vercel Cron schedules
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 🤖 AI Research Engine

The research engine lives in [`src/lib/ai-engine.ts`](src/lib/ai-engine.ts) and
exposes the following primitives — all backed by the `z-ai-web-dev-sdk` with
serialized execution and exponential backoff to respect rate limits:

| Function | Output |
|----------|--------|
| `summarizeEarnings(ticker, period, transcript)` | Plain-English earnings beat/miss summary |
| `analyzeFiling(ticker, type, text)` | JSON: `{ summary, risks[], sentiment, keyChanges[] }` |
| `summarizeAnnualReport(ticker, text)` | 4-5 paragraph 10-K overview |
| `generateInvestmentThesis(company)` | 4-paragraph PM-style thesis |
| `generateBullBearCases(company)` | JSON: `{ bull, bear }` |
| `extractRisks(filing)` | Top 3-5 risk factors |
| `detectSentimentChange(newsItems)` | JSON: `{ direction, score, rationale }` |
| `generateAIRating(company)` | Composite 0-100 score across 5 pillars |
| `generateAnalystReport(company)` | Full institutional-grade markdown report |
| `persistAnalystReport(companyId)` | Saves report + rating to the database |

The **AI Chat Analyst** (`POST /api/chat`) provides conversational Q&A with
company-specific context — ask any question and get institutional-grade answers.

---

## ⚙️ Autonomous Pipeline

Vercel Cron drives the autonomous pipeline. The schedules are defined in
[`vercel.json`](vercel.json):

| Endpoint | Schedule | Job Type | Description |
|----------|----------|----------|-------------|
| `/api/cron/process-jobs` | `* * * * *` | (all) | Process queued jobs every minute |
| `/api/cron/collect-prices` | `*/15 * * * *` | `collect_prices` | Ingest OHLCV bars |
| `/api/cron/collect-filings` | `0 * * * *` | `collect_filings` | Pull latest SEC filings |
| `/api/cron/collect-news` | `*/30 * * * *` | `collect_news` | Pull latest news + sentiment |
| `/api/cron/generate-ratings` | `0 9 * * *` | `generate_rating` | Refresh top-3 AI ratings |
| `/api/cron/generate-reports` | `0 8 * * *` | `generate_report` | Publish one analyst report |
| `/api/cron/check-alerts` | `*/5 * * * *` | `check_alerts` | Check user price/rating alerts |

Each cron endpoint is authenticated with `CRON_SECRET` to prevent abuse.

---

## 📜 License

MIT — see [LICENSE](LICENSE).

---

## ⚠️ Disclaimer

Alpha Research AI is for **research and educational purposes only**. It does
**not** constitute investment advice. Always do your own research and consult
a licensed financial advisor before making investment decisions.
