# Architecture — Alpha Research AI

> How the system is structured, how data flows, and where to extend it.

## 1. High-level diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         Browser (single page)                       │
│  Bloomberg-style dashboard — sidebar nav, ⌘K search, dark/light     │
└──────────────────┬─────────────────────────────────────────────────┘
                   │ HTTPS + Bearer token
                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Next.js 16 App Router (Edge)                    │
│  src/app/api/* — REST endpoints (auth, companies, reports, jobs, …) │
└──────┬─────────────────────┬───────────────────────┬───────────────┘
       │                     │                       │
       ▼                     ▼                       ▼
┌─────────────┐      ┌─────────────────┐    ┌─────────────────────┐
│  Prisma ORM │      │  AI Engine       │    │  Queue + Scheduler   │
│  (SQLite /  │      │  z-ai-web-dev-   │    │  In-memory (dev) /   │
│   Postgres) │      │  sdk LLM calls   │    │  Redis + BullMQ (prd)│
└──────┬──────┘      └────────┬─────────┘    └──────────┬───────────┘
       │                      │                         │
       │                      │   ┌─────────────────────┘
       │                      ▼   ▼
       │              ┌──────────────────┐
       │              │  Collectors       │
       │              │  prices, filings, │
       │              │  news, financials │
       │              └────────┬──────────┘
       │                       │
       └───────────┬───────────┘
                   ▼
        ┌────────────────────┐
        │   In-memory cache   │
        │   (Mem / Redis)     │
        └────────────────────┘
```

## 2. Layer responsibilities

### 2.1 Frontend (`src/app`, `src/components`)

- **Single route** (`/`) renders the entire dashboard. View switching is
  client-side state — this keeps the sandbox preview simple while still
  behaving like a multi-page app via the sidebar.
- **Auth** is a React context (`AuthProvider`) that stores an opaque session
  token in `localStorage` and attaches it as `Authorization: Bearer …` to
  authenticated requests.
- **Data fetching** uses TanStack Query. Each view owns its own query keys
  and refetch intervals (e.g. news refetches every 30s, jobs every 5s).
- **Theming** uses `next-themes` with a `class` strategy. The default is
  `dark` to match the Bloomberg-style aesthetic.

### 2.2 API layer (`src/app/api`)

REST endpoints grouped by resource:

| Prefix | Purpose |
|--------|---------|
| `/api/auth/{register,login,me}` | Account creation, login, current user |
| `/api/companies` | List + search companies, get prices/financials/filings/news/earnings/report/rating |
| `/api/watchlists` | CRUD watchlists + items |
| `/api/portfolio/holdings` | Portfolio positions |
| `/api/reports` | List + generate + read research reports |
| `/api/jobs` | Background job queue + manual tick |
| `/api/ai` | Direct AI primitive invocation (thesis, bull/bear, risks, …) |
| `/api/screener`, `/api/movers`, `/api/earnings`, `/api/news` | Market views |
| `/api/subscribe` | Plan upgrades |
| `/api/cache` | Cache stats + clear |
| `/api/health` | Liveness probe |

### 2.3 AI engine (`src/lib/ai-engine.ts`)

The engine wraps `z-ai-web-dev-sdk` with:
- **Serialized execution** — a single in-flight call queue prevents 429s.
- **Exponential backoff** — 1.5s → 3s → 6s → 12s on rate-limit errors.
- **Strict JSON mode** — for structured outputs (risks, scores, sentiment)
  the prompt instructs JSON-only, and `safeParse` tolerates markdown fences.
- **Composition** — `generateAnalystReport` runs thesis → bull/bear →
  annual summary → composite rating in sequence and stitches the results
  into a single markdown report.

### 2.4 Collectors (`src/lib/collectors.ts`)

In production these hit Financial Modeling Prep / Alpha Vantage / SEC EDGAR /
NewsAPI. The sandbox generates realistic synthetic data so the autonomous
pipeline is fully demonstrable. Each collector is **idempotent** — running it
twice in the same window produces the same rows (uses
`@@unique([companyId, date])` constraints and explicit existence checks).

### 2.5 Queue + scheduler (`src/lib/queue.ts`)

| Primitive | Dev implementation | Prod swap |
|-----------|-------------------|-----------|
| Cache | `Map<string, { value, expiresAt }>` | `ioredis` |
| Queue | `Job` table polled every 1.5s, 3 concurrent | `bullmq` |
| Scheduler | `ScheduledTask` table ticked every 30s | `node-cron` or k8s `CronJob` |

All consumers use the same surface (`cache.get/set`, `enqueue`,
`bootAutonomousLayer`), so swapping implementations requires no upstream
changes.

## 3. Data model

See [`prisma/schema.prisma`](../prisma/schema.prisma) for the canonical
schema. Key entities:

```
User ─┬─ Watchlist ─── WatchlistItem ─── Company
      ├─ Portfolio ─── PortfolioHolding ── Company
      ├─ ResearchReport
      └─ Session

Company ─┬─ StockPrice
         ├─ FinancialStatement
         ├─ EarningsReport
         ├─ Filing
         ├─ NewsItem
         ├─ AIRating
         └─ ResearchReport

Job              ← queued / running / completed / failed
ScheduledTask    ← cron registry + last/next run timestamps
```

## 4. Autonomous operation

The pipeline boots lazily on the first API request via
`ensureAutonomousBooted()` in `src/lib/boot.ts`:

1. Register job handlers (`collect_prices`, `collect_filings`,
   `collect_news`, `generate_rating`, `generate_report`).
2. Seed default scheduled tasks if missing.
3. Start the queue pump (1.5s interval, 3 concurrent workers).
4. Start the scheduler tick (30s interval).

From that point on, the platform:
- Ingests new market data every 15 minutes.
- Pulls new SEC filings hourly.
- Pulls new news items every 30 minutes.
- Regenerates AI ratings for top-3 companies daily at 9am.
- Publishes one new analyst report daily at 8am.

The **Admin / Jobs** view exposes all of this for inspection and manual
trigger.

## 5. Production hardening checklist

When moving from sandbox to production:

- [ ] Swap SQLite datasource in `prisma/schema.prisma` for PostgreSQL.
- [ ] Swap in-memory cache/queue for Redis + BullMQ.
- [ ] Replace the demo session model with NextAuth.js + JWT cookies.
- [ ] Replace the demo password hash with `argon2` or `bcrypt`.
- [ ] Wire real collectors to FMP / Alpha Vantage / SEC EDGAR / NewsAPI.
- [ ] Add Stripe billing for subscription plans.
- [ ] Add Sentry for error tracking, OpenTelemetry for traces.
- [ ] Add rate limiting on auth + AI endpoints (e.g. `upstash/ratelimit`).
- [ ] Run the production build via `bun run build` + a Node.js runtime,
      or use the included Dockerfile.
