/**
 * Job handlers + boot logic. Imported once per server process to register
 * handlers and start the in-process queue + scheduler loops.
 */

import { registerJobHandler, bootAutonomousLayer } from "@/lib/queue";
import { collectPrices, collectFilings, collectNews, collectFinancials } from "@/lib/collectors";
import { persistAnalystReport } from "@/lib/ai-engine";
import { db } from "@/lib/db";

let booted = false;

export async function ensureAutonomousBooted() {
  if (booted) return;
  booted = true;

  registerJobHandler("collect_prices", async () => collectPrices({ days: 3 }));
  registerJobHandler("collect_filings", async () => collectFilings());
  registerJobHandler("collect_news", async () => collectNews({ limit: 2 }));
  registerJobHandler("collect_financials", async () => collectFinancials());

  registerJobHandler("generate_rating", async () => {
    const companies = await db.company.findMany({ take: 3 });
    const out: string[] = [];
    for (const c of companies) {
      try {
        const r = await persistAnalystReport(c.id);
        out.push(`${c.ticker}: ${r.report.rating}`);
      } catch (e) {
        out.push(`${c.ticker}: error - ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { rated: out };
  });

  registerJobHandler("generate_report", async (payload) => {
    const scope = (payload.scope as string) ?? "watchlist";
    if (scope === "watchlist") {
      const wl = await db.watchlist.findFirst({ include: { items: true } });
      if (wl && wl.items[0]) {
        await persistAnalystReport(wl.items[0].companyId);
        return { report: wl.items[0].companyId };
      }
    }
    const c = await db.company.findFirst();
    if (c) {
      await persistAnalystReport(c.id);
      return { report: c.id };
    }
    return { report: null };
  });

  await bootAutonomousLayer();
}
