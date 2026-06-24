# Alpha Research AI

> AI-powered stock research platform that continuously analyzes public companies and automatically generates institutional-quality research reports.

[![CI](https://github.com/leemcchesneyclarkgmailcom/alpha-research-ai/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made with Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)

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
- 📡 **Continuous data collection** — scheduled jobs for market prices,
  financial statements, SEC filings, and company news.
- 📊 **Bloomberg-style dashboard** — watchlists, portfolio tracking, stock
  screener, AI ratings, research reports, earnings calendar, market movers,
  news & sentiment.
- 🔐 **Auth & subscriptions** — sign up / sign in, user profiles,
  Free / Pro / Institutional plans with AI credit meters.
- 🌗 **Dark / light mode**, fully responsive, accessibility-first.
- ⚙️ **Autonomous operation** — the scheduler runs continuously, refreshing
  data and publishing insights without manual intervention.

---

## 🏗️ Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, TanStack Query, Recharts, Framer Motion |
| Backend | Next.js API Routes (REST), Prisma ORM, SQLite (dev) / PostgreSQL (prod), in-memory cache & queue (dev) / Redis & BullMQ (prod) |
| AI | `z-ai-web-dev-sdk` (LLM completions with retry/backoff) |
| Auth | Custom session model (swap for NextAuth.js in prod) |
| Infra | Docker, docker-compose, GitHub Actions CI/CD |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design
and [docs/API.md](docs/API.md) for the REST surface.

---

## 🚀 Quickstart

### Prerequisites

- Node.js ≥ 20 (or [Bun](https://bun.sh) ≥ 1.1 — recommended)
- A database (SQLite for dev, PostgreSQL for prod)

### Install & run locally

```bash
# 1. Clone
git clone https://github.com/leemcchesneyclarkgmailcom/alpha-research-ai.git
cd alpha-research-ai

# 2. Install dependencies
bun install            # or: npm install / pnpm install

# 3. Configure environment
cp .env.example .env
# edit .env to match your environment

# 4. Push the database schema
bun run db:push

# 5. Seed demo data (7 companies, prices, financials, filings, news, AI reports)
bun run scripts/seed.ts

# 6. Start the dev server
bun run dev
```

Open <http://localhost:3000> in your browser. Use the **demo account** to
explore the dashboard:

```
email:    demo@alpha-research.ai
password: demo
```

### Production build

```bash
bun run build
bun run start
```

---

## 🐳 Docker

```bash
# Build and run the full stack (app + Postgres + Redis)
docker compose up -d --build

# Tail logs
docker compose logs -f app
```

The compose file spins up:
- `app` — the Next.js production server
- `postgres` — PostgreSQL 16 database
- `redis` — Redis 7 cache & queue backend
- `worker` — background job processor

---

## 📂 Repository Structure

```
alpha-research-ai/
├── docs/
│   ├── ARCHITECTURE.md          # System design, data flow, components
│   └── API.md                   # REST API reference
├── prisma/
│   └── schema.prisma            # Database schema (User, Company, Filing, Report, Job, …)
├── src/
│   ├── app/
│   │   ├── api/                 # REST endpoints (auth, companies, reports, jobs, AI, …)
│   │   ├── layout.tsx           # Root layout with theme + auth + query providers
│   │   └── page.tsx             # Bloomberg-style single-page dashboard
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── charts/              # Price and score charts (Recharts)
│   │   ├── views/               # Dashboard views (overview, watchlists, portfolio, …)
│   │   ├── auth-provider.tsx    # Client auth context
│   │   ├── auth-dialog.tsx      # Sign in / sign up modal
│   │   ├── profile-dialog.tsx   # Profile + subscription management
│   │   └── command-search.tsx   # ⌘K company search
│   └── lib/
│       ├── ai-engine.ts         # LLM research primitives (thesis, bull/bear, risks, …)
│       ├── collectors.ts        # Market data, filings, news ingestion
│       ├── queue.ts             # In-memory cache + queue + scheduler
│       ├── boot.ts              # Autonomous layer boot (registers handlers)
│       ├── auth.ts              # Session resolution
│       ├── db.ts                # Prisma client
│       ├── format.ts            # Display formatters
│       └── utils.ts             # Tailwind merge helpers
├── scripts/
│   └── seed.ts                  # Demo data seeder (companies, prices, AI reports)
├── .github/
│   ├── workflows/ci.yml         # Lint + type-check + build
│   ├── ISSUE_TEMPLATE/          # Bug & feature templates
│   └── PULL_REQUEST_TEMPLATE.md
├── Dockerfile                   # Multi-stage production build
├── docker-compose.yml           # Full stack deployment
└── .env.example                 # Environment variable reference
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

---

## ⚙️ Autonomous Pipeline

A single `bootAutonomousLayer()` call (triggered on first API request) registers
the following scheduled jobs:

| Task | Cron | Job Type | Description |
|------|------|----------|-------------|
| `refresh-market-prices` | `*/15 * * * *` | `collect_prices` | Ingest 3 days of OHLCV bars |
| `ingest-sec-filings` | `0 * * * *` | `collect_filings` | Pull latest 10-K / 10-Q / 8-K filings |
| `monitor-company-news` | `*/30 * * * *` | `collect_news` | Pull latest news + sentiment |
| `regenerate-ai-ratings` | `0 9 * * *` | `generate_rating` | Refresh top-3 AI ratings daily |
| `publish-daily-reports` | `0 8 * * *` | `generate_report` | Publish one new analyst report |

The **Admin / Jobs** view in the dashboard exposes the live queue, lets you
trigger the pipeline manually, and inspect cache stats.

---

## 🧪 Testing

```bash
bun run lint           # ESLint
bun run db:push        # Verify schema
bun run scripts/seed.ts # Smoke-test the full pipeline
```

Automated test suites are wired into [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## 🚢 Deployment

### Vercel (recommended for the Next.js app)

1. Import the repo at <https://vercel.com/new>
2. Set environment variables from `.env.example`
3. Run `bun run db:push` once against your production database
4. Deploy

### Self-hosted with Docker

```bash
docker compose up -d --build
```

The compose file publishes the app on port 3000, Postgres on 5432, and Redis
on 6379. Adjust the volume mounts and env vars in `docker-compose.yml` for
your environment.

---

## 📜 License

MIT — see [LICENSE](LICENSE).

---

## ⚠️ Disclaimer

Alpha Research AI is for **research and educational purposes only**. It does
**not** constitute investment advice. Always do your own research and consult
a licensed financial advisor before making investment decisions.
