/**
 * Data collection layer.
 *
 * In production these functions hit real APIs (Financial Modeling Prep,
 * Alpha Vantage, SEC EDGAR, NewsAPI). In this sandbox we generate realistic
 * synthetic data so the autonomous pipeline and dashboard remain fully
 * functional. Each collector writes new records into SQLite and is idempotent
 * — running twice with the same window produces the same rows.
 */

import { db } from "@/lib/db";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function collectPrices(args: { ticker?: string; days?: number } = {}) {
  const companies = args.ticker
    ? await db.company.findMany({ where: { ticker: args.ticker } })
    : await db.company.findMany();

  const days = args.days ?? 5;
  const today = new Date();
  const results: { ticker: string; bars: number }[] = [];

  for (const company of companies) {
    const rng = seededRandom(hashString(company.ticker));
    const latest = await db.stockPrice.findFirst({
      where: { companyId: company.id },
      orderBy: { date: "desc" },
    });
    let price = latest?.close ?? 100 + rng() * 300;

    let bars = 0;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      // Skip weekends to mimic market calendar.
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const existing = await db.stockPrice.findUnique({
        where: { companyId_date: { companyId: company.id, date: dateOnly } },
      });
      if (existing) continue;

      const drift = (rng() - 0.48) * price * 0.025;
      const open = price;
      const close = Math.max(1, price + drift);
      const high = Math.max(open, close) * (1 + rng() * 0.01);
      const low = Math.min(open, close) * (1 - rng() * 0.01);
      const volume = Math.round((1 + rng() * 4) * 1_000_000);

      await db.stockPrice.create({
        data: {
          companyId: company.id,
          date: dateOnly,
          open: round2(open),
          high: round2(high),
          low: round2(low),
          close: round2(close),
          volume,
          change: round2(close - open),
        },
      });
      price = close;
      bars++;
    }
    results.push({ ticker: company.ticker, bars });
  }
  return { collected: results };
}

export async function collectFilings(args: { ticker?: string } = {}) {
  const companies = args.ticker
    ? await db.company.findMany({ where: { ticker: args.ticker } })
    : await db.company.findMany({ take: 5 });

  const filingTypes = ["10-K", "10-Q", "8-K", "DEF 14A"];
  const riskPool = [
    "Macroeconomic slowdown could reduce discretionary spend.",
    "Supply chain disruption may impact gross margins.",
    "Currency volatility creates earnings unpredictability.",
    "Regulatory changes in key jurisdictions may compress returns.",
    "Cybersecurity incidents could damage brand and operations.",
    "Competitive entrants with lower cost structures.",
    "Talent retention pressure in core engineering functions.",
  ];
  const results: { ticker: string; type: string }[] = [];

  for (const company of companies) {
    const rng = seededRandom(hashString(company.ticker) + Date.now() % 86_400_000);
    const type = filingTypes[Math.floor(rng() * filingTypes.length)];
    const period = type === "10-K" ? "FY2024" : `Q${1 + Math.floor(rng() * 4)}-2025`;
    const filedAt = new Date(Date.now() - Math.floor(rng() * 14) * 86_400_000);

    const dup = await db.filing.findFirst({
      where: { companyId: company.id, type, period },
    });
    if (dup) continue;

    const risks = Array.from({ length: 3 + Math.floor(rng() * 3) }, () =>
      riskPool[Math.floor(rng() * riskPool.length)],
    );
    const sentiment = rng() > 0.66 ? "positive" : rng() > 0.33 ? "neutral" : "negative";

    await db.filing.create({
      data: {
        companyId: company.id,
        type,
        period,
        filedAt,
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.ticker}`,
        summary: `${company.name} filed ${type} for ${period}. Key highlights include operating performance updates and forward-looking risk disclosures.`,
        risks: JSON.stringify(risks),
        sentiment,
      },
    });
    results.push({ ticker: company.ticker, type });
  }
  return { collected: results };
}

const NEWS_TEMPLATES = [
  {
    headline: (t: string) => `${t} announces strategic partnership to expand platform reach`,
    sentiment: "positive",
    score: 0.62,
  },
  {
    headline: (t: string) => `Analysts raise price targets on ${t} after strong quarter`,
    sentiment: "positive",
    score: 0.71,
  },
  {
    headline: (t: string) => `${t} faces regulatory scrutiny in European markets`,
    sentiment: "negative",
    score: -0.45,
  },
  {
    headline: (t: string) => `${t} unveils new AI product line at industry conference`,
    sentiment: "positive",
    score: 0.55,
  },
  {
    headline: (t: string) => `${t} shares dip amid broad sector sell-off`,
    sentiment: "negative",
    score: -0.32,
  },
  {
    headline: (t: string) => `${t} CFO discusses capital allocation on earnings call`,
    sentiment: "neutral",
    score: 0.05,
  },
  {
    headline: (t: string) => `${t} expands buyback program by $20B`,
    sentiment: "positive",
    score: 0.48,
  },
  {
    headline: (t: string) => `Supply chain headwinds could pressure ${t} margins`,
    sentiment: "negative",
    score: -0.28,
  },
];

export async function collectNews(args: { ticker?: string; limit?: number } = {}) {
  const companies = args.ticker
    ? await db.company.findMany({ where: { ticker: args.ticker } })
    : await db.company.findMany({ take: 6 });

  const limit = args.limit ?? 2;
  const sources = ["Bloomberg", "Reuters", "WSJ", "CNBC", "Financial Times", "MarketWatch"];
  const results: { ticker: string; headline: string }[] = [];

  for (const company of companies) {
    const rng = seededRandom(hashString(company.ticker) + Date.now());
    for (let i = 0; i < limit; i++) {
      const tpl = NEWS_TEMPLATES[Math.floor(rng() * NEWS_TEMPLATES.length)];
      const publishedAt = new Date(Date.now() - Math.floor(rng() * 48) * 3_600_000);
      const headline = tpl.headline(company.ticker);

      const exists = await db.newsItem.findFirst({
        where: { companyId: company.id, headline, publishedAt },
      });
      if (exists) continue;

      await db.newsItem.create({
        data: {
          companyId: company.id,
          headline,
          summary: `Market participants react to ${company.ticker}'s latest developments. ${company.name} continues to navigate a complex macro backdrop while executing on its strategic roadmap.`,
          url: `https://example.com/news/${company.ticker.toLowerCase()}/${Date.now()}`,
          source: sources[Math.floor(rng() * sources.length)],
          sentiment: tpl.sentiment,
          sentimentScore: tpl.score,
          publishedAt,
        },
      });
      results.push({ ticker: company.ticker, headline });
    }
  }
  return { collected: results };
}

export async function collectFinancials(args: { ticker?: string } = {}) {
  const companies = args.ticker
    ? await db.company.findMany({ where: { ticker: args.ticker } })
    : await db.company.findMany();

  const results: { ticker: string; period: string }[] = [];
  for (const company of companies) {
    const rng = seededRandom(hashString(company.ticker));
    const revenue = (50 + rng() * 400) * 1e9;
    const gross = revenue * (0.4 + rng() * 0.3);
    const opInc = gross * (0.25 + rng() * 0.25);
    const netInc = opInc * (0.75 + rng() * 0.15);
    for (const period of ["FY2023", "FY2024", "Q1-2025", "Q2-2025"]) {
      const dup = await db.financialStatement.findFirst({
        where: { companyId: company.id, period },
      });
      if (dup) continue;
      const factor = period.includes("Q") ? 0.25 : 1;
      await db.financialStatement.create({
        data: {
          companyId: company.id,
          period,
          type: period.includes("Q") ? "income" : "income",
          revenue: revenue * factor,
          grossProfit: gross * factor,
          operatingIncome: opInc * factor,
          netIncome: netInc * factor,
          eps: (netInc * factor) / (1e9 + rng() * 5e9),
          totalAssets: revenue * (1.5 + rng()),
          totalLiabilities: revenue * (0.6 + rng() * 0.4),
          cash: revenue * (0.15 + rng() * 0.2),
          debt: revenue * (0.2 + rng() * 0.3),
          operatingCashFlow: netInc * (1.1 + rng() * 0.3),
          capex: revenue * (0.03 + rng() * 0.05),
          freeCashFlow: netInc * (0.9 + rng() * 0.2),
        },
      });
      results.push({ ticker: company.ticker, period });
    }
  }
  return { collected: results };
}

/**
 * Collect insider transactions (mock data). Generates realistic buy/sell
 * transactions for company insiders (CEO, CFO, directors, officers).
 */
export async function collectInsiders(args: { ticker?: string; limit?: number } = {}) {
  const companies = args.ticker
    ? await db.company.findMany({ where: { ticker: args.ticker } })
    : await db.company.findMany();

  const insiderNames = [
    "Tim Cook", "Luca Maestri", "Jeff Williams", "Katherine Adams", "Satya Nadella",
    "Amy Hood", "Brad Smith", "Jensen Huang", "Colette Kress", "Sundar Pichai",
    "Ruth Porat", "Philipp Schindler", "Andy Jassy", "Brian Olsavsky", "Mark Zuckerberg",
    "JavierOlivan", "Susan Li", "Elon Musk", "Vaibhav Taneja", "Vaibhav Taneja",
  ];
  const titles = ["CEO", "CFO", "COO", "Director", "VP", "Chief Legal Officer", "Chief Product Officer"];

  const results: { ticker: string; insider: string }[] = [];

  for (const company of companies) {
    const rng = seededRandom(hashString(company.ticker) + Date.now() % 86_400_000);
    const numTx = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < numTx; i++) {
      const insider = insiderNames[Math.floor(rng() * insiderNames.length)];
      const title = titles[Math.floor(rng() * titles.length)];
      const type = rng() > 0.4 ? "sell" : "buy";
      const shares = Math.round((1000 + rng() * 50000) / 100) * 100;
      const price = (company.peRatio ?? 100) * (0.8 + rng() * 0.4);
      const value = shares * price;
      const filedAt = new Date(Date.now() - Math.floor(rng() * 30) * 86_400_000);

      const exists = await db.insiderTransaction.findFirst({
        where: { companyId: company.id, insider, filedAt, shares },
      });
      if (exists) continue;

      await db.insiderTransaction.create({
        data: {
          companyId: company.id,
          insider,
          title,
          type,
          shares,
          price: round2(price),
          value: round2(value),
          filedAt,
        },
      });
      results.push({ ticker: company.ticker, insider });
    }
  }
  return { collected: results };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
