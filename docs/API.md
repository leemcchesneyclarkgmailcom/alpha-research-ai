# API Reference — Alpha Research AI

Base URL: `https://<your-domain>/api`

All authenticated endpoints expect:
```
Authorization: Bearer <token>
```
Tokens are returned by `POST /api/auth/login` and `POST /api/auth/register`.

Unauthenticated requests are accepted on read-only endpoints and fall back
to the seeded demo user, so the dashboard is browsable without sign-in.

---

## Auth

### `POST /auth/register`
Create a new account.

**Body**
```json
{ "email": "you@example.com", "password": "secret", "name": "Jane Analyst" }
```
**201**
```json
{
  "token": "uuid",
  "user": { "id": "...", "email": "...", "name": "...", "plan": "free" }
}
```

### `POST /auth/login`
**Body** `{ "email", "password" }` → **200** same shape as register.

### `GET /auth/me`
Returns the current user or `{ user: null }`.

### `DELETE /auth/me`
Logout (client clears token).

---

## Companies

### `GET /companies`
List all tracked companies with latest price + rating.

**200**
```json
{
  "companies": [{
    "id": "...", "ticker": "AAPL", "name": "Apple Inc.",
    "exchange": "NASDAQ", "sector": "Technology",
    "marketCap": 3450000000000, "peRatio": 32.4, "eps": 6.5,
    "price": 218.50, "changePct": 1.42,
    "rating": "buy", "score": 72
  }]
}
```

### `GET /companies/search?q=aapl`
Returns up to 8 matches by ticker or name.

### `GET /companies/:id`
Full company profile with 60 most recent prices, latest rating, last 4
earnings, last 8 filings, last 10 news items, all financials.

### `GET /companies/:id/prices`
180 most recent OHLCV bars (ascending).

### `GET /companies/:id/financials`
All financial statements.

### `GET /companies/:id/filings`
20 most recent SEC filings with parsed risks.

### `GET /companies/:id/news`
25 most recent news items with sentiment.

### `GET /companies/:id/earnings`
8 most recent earnings reports with surprises + guidance.

### `GET /companies/:id/rating`
Latest AI rating.

### `POST /companies/:id/rating`
**Body** `{ "sync": true }` → blocks and returns the new rating ID.
Without `sync`, enqueues a background job.

### `GET /companies/:id/report`
10 most recent research reports.

### `POST /companies/:id/report`
**Body** `{ "sync": true }` → blocks and returns the new report.
Without `sync`, enqueues a background job.

---

## Watchlists

### `GET /watchlists`
All watchlists for the current user with items + latest prices.

### `POST /watchlists`
**Body** `{ "name": "Magnificent 7" }` → creates a new watchlist.

### `POST /watchlists/:id/items`
**Body** `{ "companyId": "..." }` or `{ "ticker": "AAPL" }` → adds a symbol.

### `DELETE /watchlists/:id/items?companyId=...`
Removes a symbol from the watchlist.

---

## Portfolio

### `GET /portfolio/holdings`
All portfolios with holdings, market value, cost basis, and P&L.

### `POST /portfolio/holdings`
**Body**
```json
{ "ticker": "AAPL", "shares": 100, "avgCost": 158.20 }
```
Creates or increments a holding.

---

## Research Reports

### `GET /reports?limit=20&type=analyst`
List reports. Optional `type` filter: `analyst | earnings | thesis | risk`.

### `GET /reports/:id`
Single report with full markdown content + company.

### `POST /reports/generate`
**Body** `{ "ticker": "AAPL", "sync": true }` → generates and returns a
full analyst report.

---

## AI Engine

### `POST /ai`
Invoke a specific AI primitive. **Body**:
```json
{
  "action": "thesis" | "bullbear" | "risks" | "sentiment" |
            "earnings-summary" | "filing-analysis" | "annual-summary" |
            "analyst-report",
  "company": "AAPL",            // ticker or id
  "period": "Q2-2025",          // for earnings / filings
  "filingType": "10-K",
  "text": "...",                // optional source text
  "transcript": "...",          // for earnings-summary
  "news": [{ "headline": "...", "publishedAt": "...", "summary": "..." }]
}
```

Each action charges one AI credit against the user's quota.

---

## Market Views

### `GET /screener?sector=&minMarketCap=&maxPe=&rating=&sort=&order=&limit=`
Filter companies by sector, market cap, P/E, AI rating. Sortable by
`marketCap | ticker | name | peRatio`.

### `GET /movers?limit=10`
Returns `{ gainers, losers, active }` arrays.

### `GET /earnings`
Earnings calendar across all companies.

### `GET /news?limit=30&sentiment=positive`
News feed, optional sentiment filter.

---

## Jobs & Scheduler

### `GET /jobs?limit=50&status=queued`
List background jobs.

### `GET /jobs/:id`
Single job status.

### `GET /jobs/tick`
Returns queue stats + scheduled tasks.

### `POST /jobs/tick`
Manually trigger the autonomous pipeline — runs all collectors immediately.

---

## Account

### `POST /subscribe`
**Body** `{ "plan": "free" | "pro" | "institutional" }` → upgrade/downgrade.

### `GET /cache`
Cache stats (size, hits, misses, hit rate).

### `DELETE /cache`
Clear the in-memory cache.

### `GET /health`
Liveness probe — returns service version + cache stats.

---

## Error responses

All error responses follow:
```json
{ "error": "human-readable message" }
```
With appropriate HTTP status codes (400, 401, 404, 409, 500).
