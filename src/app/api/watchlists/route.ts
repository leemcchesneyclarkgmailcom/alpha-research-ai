import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ watchlists: [] });

  const watchlists = await db.watchlist.findMany({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          company: {
            include: {
              prices: { orderBy: { date: "desc" }, take: 2 },
              ratings: { orderBy: { generatedAt: "desc" }, take: 1 },
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  const result = watchlists.map((wl) => ({
    id: wl.id,
    name: wl.name,
    items: wl.items.map((it) => {
      const latest = it.company.prices[0];
      const prior = it.company.prices[1];
      const changePct =
        latest && prior ? ((latest.close - prior.close) / prior.close) * 100 : 0;
      return {
        id: it.id,
        companyId: it.company.id,
        ticker: it.company.ticker,
        name: it.company.name,
        sector: it.company.sector,
        price: latest?.close ?? null,
        changePct: Math.round(changePct * 100) / 100,
        rating: it.company.ratings[0]?.rating ?? null,
        score: it.company.ratings[0]?.score ?? null,
        addedAt: it.addedAt.toISOString(),
      };
    }),
  }));

  return NextResponse.json({ watchlists: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const wl = await db.watchlist.create({ data: { userId: user.id, name } });
  return NextResponse.json({ watchlist: wl });
}
