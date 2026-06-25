import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserOrDemo(req);
  if (!user) return NextResponse.json({ alerts: [] });

  const { searchParams } = new URL(req.url);
  const includeTriggered = searchParams.get("all") === "true";

  const alerts = await db.alert.findMany({
    where: {
      userId: user.id,
      ...(includeTriggered ? {} : { active: true }),
    },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      ...a,
      triggeredAt: a.triggeredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      company: {
        id: a.company.id,
        ticker: a.company.ticker,
        name: a.company.name,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to create alerts" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    companyId?: string;
    ticker?: string;
    type?: string;
    threshold?: number;
  };

  if (!body.type || !["price_above", "price_below", "rating_change", "earnings"].includes(body.type)) {
    return NextResponse.json({ error: "valid type required" }, { status: 400 });
  }

  let company = body.companyId
    ? await db.company.findUnique({ where: { id: body.companyId } })
    : body.ticker
      ? await db.company.findUnique({ where: { ticker: body.ticker.toUpperCase() } })
      : null;
  if (!company) return NextResponse.json({ error: "company not found" }, { status: 404 });

  if ((body.type === "price_above" || body.type === "price_below") && !body.threshold) {
    return NextResponse.json({ error: "threshold required for price alerts" }, { status: 400 });
  }

  const alert = await db.alert.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      type: body.type,
      threshold: body.threshold ?? null,
    },
  });

  return NextResponse.json({ alert });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const alertId = searchParams.get("id");
  if (!alertId) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.alert.deleteMany({ where: { id: alertId, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
