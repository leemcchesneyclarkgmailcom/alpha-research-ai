import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { companyId, ticker } = (await req.json().catch(() => ({}))) as {
    companyId?: string;
    ticker?: string;
  };

  let company = companyId
    ? await db.company.findUnique({ where: { id: companyId } })
    : ticker
      ? await db.company.findUnique({ where: { ticker: ticker.toUpperCase() } })
      : null;
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  const wl = await db.watchlist.findUnique({ where: { id } });
  if (!wl || wl.userId !== user.id)
    return NextResponse.json({ error: "watchlist not found" }, { status: 404 });

  const item = await db.watchlistItem.upsert({
    where: { watchlistId_companyId: { watchlistId: id, companyId: company.id } },
    update: {},
    create: { watchlistId: id, companyId: company.id },
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
  await db.watchlistItem.deleteMany({ where: { companyId } });
  return NextResponse.json({ ok: true });
}
