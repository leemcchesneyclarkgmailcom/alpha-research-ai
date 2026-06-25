"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompare, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtCurrency, fmtPct, ratingLabel, RATING_COLORS } from "@/lib/format";
import { PriceChart } from "@/components/charts/price-chart";

interface CompareRow {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  beta: number | null;
  price: number | null;
  changePct: number;
  change30dPct: number;
  rating: string | null;
  score: number | null;
  valuation: number | null;
  growth: number | null;
  profitability: number | null;
  health: number | null;
  momentum: number | null;
  bullCase: string | null;
  bearCase: string | null;
  revenue: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
  epsSurprise: number | null;
  priceHistory: { date: string; close: number }[];
}

export function CompareView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: companiesData } = useQuery({
    queryKey: ["companies-for-compare"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      return res.json() as Promise<{ companies: { id: string; ticker: string; name: string }[] }>;
    },
  });

  const qs = selectedIds.length >= 2 ? `?ids=${selectedIds.join(",")}` : "";
  const { data, isLoading } = useQuery({
    queryKey: ["compare", qs],
    queryFn: async () => {
      const res = await fetch(`/api/compare${qs}`);
      return res.json() as Promise<{ companies: CompareRow[] }>;
    },
    enabled: selectedIds.length >= 2,
  });

  const companies = data?.companies ?? [];

  function addCompany(id: string) {
    if (selectedIds.length >= 4) return;
    if (!selectedIds.includes(id)) setSelectedIds([...selectedIds, id]);
  }

  function removeCompany(id: string) {
    setSelectedIds(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Comparison</h1>
        <p className="text-sm text-muted-foreground">
          Side-by-side comparison of up to 4 companies — metrics, ratings, and price performance.
        </p>
      </div>

      {/* Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitCompare className="h-4 w-4" /> Select companies ({selectedIds.length}/4)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {selectedIds.map((id) => {
            const c = companiesData?.companies.find((x) => x.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {c?.ticker ?? id}
                <button onClick={() => removeCompany(id)} className="ml-1 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {selectedIds.length < 4 && (
            <Select onValueChange={addCompany}>
              <SelectTrigger className="h-8 w-48 text-sm">
                <SelectValue placeholder="Add company…" />
              </SelectTrigger>
              <SelectContent>
                {(companiesData?.companies ?? [])
                  .filter((c) => !selectedIds.includes(c.id))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-mono">{c.ticker}</span> — {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedIds.length < 2 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GitCompare className="mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-medium">Select at least 2 companies</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Add companies above to see a side-by-side comparison.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          {/* Comparison table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metrics</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Metric</th>
                    {companies.map((c) => (
                      <th key={c.id} className="px-4 py-2 text-right">
                        <button
                          onClick={() => onOpenCompany(c.id)}
                          className="font-mono text-sm font-bold hover:underline"
                        >
                          {c.ticker}
                        </button>
                        <div className="text-xs font-normal text-muted-foreground">{c.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Sector" values={companies.map((c) => c.sector ?? "—")} />
                  <CompareRow label="Industry" values={companies.map((c) => c.industry ?? "—")} />
                  <CompareRow label="Price" values={companies.map((c) => fmtCurrency(c.price))} />
                  <CompareRow
                    label="1d Change"
                    values={companies.map((c) => fmtPct(c.changePct))}
                    colorize
                  />
                  <CompareRow
                    label="30d Change"
                    values={companies.map((c) => fmtPct(c.change30dPct))}
                    colorize
                  />
                  <CompareRow label="Market Cap" values={companies.map((c) => fmtCurrency(c.marketCap, { compact: true }))} />
                  <CompareRow label="P/E Ratio" values={companies.map((c) => c.peRatio?.toFixed(1) ?? "—")} />
                  <CompareRow label="EPS" values={companies.map((c) => c.eps ? `$${c.eps.toFixed(2)}` : "—")} />
                  <CompareRow label="Div Yield" values={companies.map((c) => c.dividendYield ? `${c.dividendYield.toFixed(2)}%` : "—")} />
                  <CompareRow label="Beta" values={companies.map((c) => c.beta?.toFixed(2) ?? "—")} />
                  <CompareRow label="Revenue" values={companies.map((c) => fmtCurrency(c.revenue, { compact: true }))} />
                  <CompareRow label="Net Income" values={companies.map((c) => fmtCurrency(c.netIncome, { compact: true }))} />
                  <CompareRow label="Free Cash Flow" values={companies.map((c) => fmtCurrency(c.freeCashFlow, { compact: true }))} />
                  <CompareRow
                    label="EPS Surprise"
                    values={companies.map((c) => c.epsSurprise ? fmtPct(c.epsSurprise) : "—")}
                    colorize
                  />
                  <CompareRow
                    label="AI Rating"
                    values={companies.map((c) => c.rating ? ratingLabel(c.rating) : "—")}
                    badges={companies.map((c) => c.rating ? RATING_COLORS[c.rating] : "")}
                  />
                  <CompareRow label="AI Score" values={companies.map((c) => c.score ? `${c.score}/100` : "—")} />
                  <CompareRow label="Valuation" values={companies.map((c) => c.valuation?.toString() ?? "—")} />
                  <CompareRow label="Growth" values={companies.map((c) => c.growth?.toString() ?? "—")} />
                  <CompareRow label="Profitability" values={companies.map((c) => c.profitability?.toString() ?? "—")} />
                  <CompareRow label="Health" values={companies.map((c) => c.health?.toString() ?? "—")} />
                  <CompareRow label="Momentum" values={companies.map((c) => c.momentum?.toString() ?? "—")} />
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Price chart overlay */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Price Performance (30 days)</CardTitle>
              <CardDescription className="text-xs">Normalized to first day = 100</CardDescription>
            </CardHeader>
            <CardContent>
              <PriceChart
                data={normalizePriceHistories(companies)}
                height={300}
                color="hsl(var(--chart-1))"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function CompareRow({
  label,
  values,
  colorize,
  badges,
}: {
  label: string;
  values: string[];
  colorize?: boolean;
  badges?: string[];
}) {
  // Find best value for highlighting
  const numValues = values.map((v) => parseFloat(v.replace(/[^0-9.-]/g, "")));
  const hasNums = numValues.some((n) => !isNaN(n));
  const bestIdx = hasNums
    ? numValues.reduce((best, n, i) => (isNaN(n) ? best : n > (isNaN(numValues[best]) ? -Infinity : numValues[best]) ? i : best), 0)
    : -1;

  return (
    <tr className="border-b border-border/50 hover:bg-accent/30">
      <td className="px-4 py-2 text-xs text-muted-foreground">{label}</td>
      {values.map((v, i) => {
        const isBest = colorize && i === bestIdx && hasNums;
        const badgeCls = badges?.[i];
        return (
          <td key={i} className="px-4 py-2 text-right">
            {badgeCls ? (
              <Badge variant="outline" className={`text-[10px] ${badgeCls}`}>{v}</Badge>
            ) : (
              <span className={`tabular-nums ${isBest ? "font-bold text-emerald-500" : ""}`}>
                {v}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function normalizePriceHistories(companies: CompareRow[]): { date: string; close: number }[] {
  if (companies.length === 0) return [];
  // Use the shortest history length so all companies align.
  const minLen = Math.min(...companies.map((c) => c.priceHistory.length));
  if (minLen === 0) return [];

  // Build an array of { date, close1, close2, ... } normalized to 100.
  const result: { date: string; close: number }[] = [];
  for (let i = 0; i < minLen; i++) {
    // Average normalized value across all companies.
    let sum = 0;
    for (const c of companies) {
      const base = c.priceHistory[0].close;
      sum += (c.priceHistory[i].close / base) * 100;
    }
    result.push({
      date: companies[0].priceHistory[i].date,
      close: Math.round((sum / companies.length) * 100) / 100,
    });
  }
  return result;
}
