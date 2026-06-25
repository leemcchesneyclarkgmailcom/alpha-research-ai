/**
 * Seed Alpha Research AI with realistic demo data.
 *
 *   bun run scripts/seed.ts
 *
 * Idempotent — running twice will not create duplicate companies, prices,
 * financials, or reports. Safe to re-run after schema changes.
 */

import { db } from "../src/lib/db";
import { collectPrices, collectFilings, collectNews, collectFinancials, collectInsiders } from "../src/lib/collectors";
import { persistAnalystReport } from "../src/lib/ai-engine";
import bcrypt from "bcryptjs";

const COMPANIES = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Consumer Electronics",
    website: "https://www.apple.com",
    ceo: "Tim Cook",
    employees: 164000,
    headquarters: "Cupertino, California",
    marketCap: 3_450_000_000_000,
    peRatio: 32.4,
    eps: 6.5,
    dividendYield: 0.45,
    beta: 1.24,
    description:
      "Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories. Its services franchise — App Store, iCloud, Apple Music, Apple Pay — is the primary margin and growth engine.",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Software — Infrastructure",
    website: "https://www.microsoft.com",
    ceo: "Satya Nadella",
    employees: 228000,
    headquarters: "Redmond, Washington",
    marketCap: 3_320_000_000_000,
    peRatio: 36.8,
    eps: 11.2,
    dividendYield: 0.72,
    beta: 0.92,
    description:
      "Microsoft develops productivity, cloud, and gaming platforms. Azure is the second-largest public cloud and the company's primary growth driver, complemented by Microsoft 365, LinkedIn, and the Copilot AI franchise.",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Semiconductors",
    website: "https://www.nvidia.com",
    ceo: "Jensen Huang",
    employees: 29600,
    headquarters: "Santa Clara, California",
    marketCap: 3_180_000_000_000,
    peRatio: 64.2,
    eps: 2.45,
    dividendYield: 0.03,
    beta: 1.74,
    description:
      "NVIDIA designs accelerated computing platforms, including the GeForce, Quadro, Tesla, and Hopper/H100 GPU families. Its CUDA software ecosystem and AI inference leadership position it as the foundational compute layer for the AI buildout.",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    exchange: "NASDAQ",
    sector: "Communication Services",
    industry: "Internet Content & Information",
    website: "https://www.abc.xyz",
    ceo: "Sundar Pichai",
    employees: 182000,
    headquarters: "Mountain View, California",
    marketCap: 2_180_000_000_000,
    peRatio: 24.1,
    eps: 7.42,
    dividendYield: 0.0,
    beta: 1.05,
    description:
      "Alphabet operates Google Search, YouTube, Android, Cloud, and Other Bets including Waymo and Verily. Search and YouTube remain the dominant cash engines while Cloud and Gemini AI provide the next leg of growth.",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    exchange: "NASDAQ",
    sector: "Consumer Cyclical",
    industry: "Internet Retail",
    website: "https://www.amazon.com",
    ceo: "Andy Jassy",
    employees: 1525000,
    headquarters: "Seattle, Washington",
    marketCap: 2_050_000_000_000,
    peRatio: 42.8,
    eps: 4.15,
    dividendYield: 0.0,
    beta: 1.15,
    description:
      "Amazon operates the largest e-commerce marketplace, AWS public cloud, advertising, Prime subscription, and logistics franchise. AWS generates the majority of operating profit while retail and advertising drive top-line scale.",
  },
  {
    ticker: "META",
    name: "Meta Platforms, Inc.",
    exchange: "NASDAQ",
    sector: "Communication Services",
    industry: "Internet Content & Information",
    website: "https://www.meta.com",
    ceo: "Mark Zuckerberg",
    employees: 74067,
    headquarters: "Menlo Park, California",
    marketCap: 1_460_000_000_000,
    peRatio: 27.9,
    eps: 17.4,
    dividendYield: 0.32,
    beta: 1.21,
    description:
      "Meta operates Facebook, Instagram, WhatsApp, and Messenger. The Family of Apps monetizes through advertising; Reality Labs invests in AR/VR. AI-driven feed improvements and Reels monetization are the near-term drivers.",
  },
  {
    ticker: "TSLA",
    name: "Tesla, Inc.",
    exchange: "NASDAQ",
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
    website: "https://www.tesla.com",
    ceo: "Elon Musk",
    employees: 140473,
    headquarters: "Austin, Texas",
    marketCap: 780_000_000_000,
    peRatio: 58.6,
    eps: 3.6,
    dividendYield: 0.0,
    beta: 2.04,
    description:
      "Tesla designs and manufactures electric vehicles, energy storage, and solar products. Its long-term thesis hinges on full self-driving, the Optimus humanoid robot, and the ramp of the Cybertruck and next-generation vehicle platform.",
  },
];

async function main() {
  console.log("→ Seeding companies…");
  for (const c of COMPANIES) {
    await db.company.upsert({
      where: { ticker: c.ticker },
      update: c,
      create: c,
    });
  }

  console.log("→ Seeding demo user, watchlist, portfolio…");
  const demoPasswordHash = await bcrypt.hash("demo", 12);
  const user = await db.user.upsert({
    where: { email: "demo@alpha-research.ai" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "demo@alpha-research.ai",
      name: "Demo Analyst",
      role: "admin",
      plan: "pro",
      creditsLimit: 250,
      passwordHash: demoPasswordHash,
    },
  });

  const existingWl = await db.watchlist.findFirst({ where: { userId: user.id, name: "Magnificent 7" } });
  const watchlist = existingWl
    ? existingWl
    : await db.watchlist.create({ data: { userId: user.id, name: "Magnificent 7" } });

  const existingPort = await db.portfolio.findFirst({ where: { userId: user.id, name: "Core Growth" } });
  const portfolio = existingPort
    ? existingPort
    : await db.portfolio.create({ data: { userId: user.id, name: "Core Growth" } });

  console.log("→ Seeding watchlist items, portfolio holdings, earnings…");
  const allCompanies = await db.company.findMany();
  const holdings: { ticker: string; shares: number; avgCost: number }[] = [
    { ticker: "AAPL", shares: 120, avgCost: 158.2 },
    { ticker: "MSFT", shares: 80, avgCost: 305.5 },
    { ticker: "NVDA", shares: 200, avgCost: 410.0 },
    { ticker: "GOOGL", shares: 150, avgCost: 138.7 },
    { ticker: "AMZN", shares: 90, avgCost: 142.1 },
  ];
  for (const c of allCompanies) {
    await db.watchlistItem.upsert({
      where: { watchlistId_companyId: { watchlistId: watchlist.id, companyId: c.id } },
      update: {},
      create: { watchlistId: watchlist.id, companyId: c.id },
    });
    const h = holdings.find((x) => x.ticker === c.ticker);
    if (h) {
      await db.portfolioHolding.upsert({
        where: { portfolioId_companyId: { portfolioId: portfolio.id, companyId: c.id } },
        update: {},
        create: { portfolioId: portfolio.id, companyId: c.id, shares: h.shares, avgCost: h.avgCost },
      });
    }
    const epsActual = c.eps ?? 1;
    const epsExpected = Math.round(epsActual * 0.95 * 100) / 100;
    const period = "Q2-2025";
    const existing = await db.earningsReport.findFirst({
      where: { companyId: c.id, period },
    });
    if (!existing) {
      await db.earningsReport.create({
        data: {
          companyId: c.id,
          period,
          reportDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 86_400_000),
          epsActual,
          epsExpected,
          revenueActual: (c.marketCap ?? 1e12) * 0.0001,
          revenueExpected: (c.marketCap ?? 1e12) * 0.0001 * 0.97,
          surprise: Math.round((epsActual - epsExpected) * 100) / 100,
          transcriptSummary: `${c.name} management highlighted operational discipline and product momentum during the ${period} call.`,
          keyTakeaways: JSON.stringify([
            "Revenue beat consensus by mid-single digits.",
            "Operating margin expanded sequentially.",
            "Guidance raised for the full year.",
          ]),
          guidance: "Management raised full-year revenue and operating margin guidance.",
        },
      });
    }
  }

  console.log("→ Collecting prices, financials, filings, news, insiders…");
  await collectFinancials();
  await collectPrices({ days: 90 });
  await collectFilings();
  await collectNews({ limit: 3 });
  await collectInsiders();

  console.log("→ Generating AI reports for top 3 companies (sequential, with retry)…");
  const top3 = await db.company.findMany({ take: 3, orderBy: { marketCap: "desc" } });
  let generated = 0;
  for (const c of top3) {
    let attempt = 0;
    while (attempt < 3) {
      try {
        await persistAnalystReport(c.id, user.id);
        console.log(`  ✓ ${c.ticker} report generated`);
        generated++;
        break;
      } catch (e) {
        attempt++;
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`  ✗ ${c.ticker} attempt ${attempt} failed: ${msg.slice(0, 100)}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
  }
  console.log(`✓ Seed complete. ${generated}/${top3.length} AI reports generated.`);
  if (generated === 0) {
    console.log("  ℹ AI reports can be generated later from the dashboard via the Reports panel.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
