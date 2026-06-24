"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/format";

interface CalendarItem {
  id: string;
  ticker: string;
  name: string;
  period: string;
  reportDate: string;
  epsActual: number | null;
  epsExpected: number | null;
  revenueActual: number | null;
  surprise: number | null;
  guidance: string | null;
}

export function EarningsView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  // We don't have company IDs in the calendar response; fetch companies to map.
  const { data: companies } = useQuery({
    queryKey: ["companies-lookup"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      return res.json() as Promise<{
        companies: { id: string; ticker: string }[];
      }>;
    },
  });
  const lookup = new Map((companies?.companies ?? []).map((c) => [c.ticker, c.id]));

  const { data, isLoading } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const res = await fetch("/api/earnings");
      return res.json() as Promise<{ calendar: CalendarItem[] }>;
    },
  });

  const items = (data?.calendar ?? []).sort(
    (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime(),
  );

  // Group by date
  const byDate = items.reduce<Record<string, CalendarItem[]>>((acc, it) => {
    (acc[it.reportDate] ??= []).push(it);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Earnings Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Reported earnings, surprises, and management guidance.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-medium">No earnings reported yet</div>
            <p className="mt-1 text-sm text-muted-foreground">
              The collector will populate this as filings are ingested.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dates.map((d) => (
            <Card key={d}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {fmtDate(d)}
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {byDate[d].length} report{byDate[d].length > 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Ticker</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">EPS Actual</TableHead>
                      <TableHead className="text-right">EPS Est.</TableHead>
                      <TableHead className="text-right">Surprise</TableHead>
                      <TableHead className="text-right pr-4">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byDate[d].map((it) => {
                      const surprise = it.surprise ?? 0;
                      const SurpriseIcon =
                        surprise > 0 ? TrendingUp : surprise < 0 ? TrendingDown : Minus;
                      return (
                        <TableRow
                          key={it.id}
                          className="cursor-pointer"
                          onClick={() => {
                            const id = lookup.get(it.ticker);
                            if (id) onOpenCompany(id);
                          }}
                        >
                          <TableCell className="pl-4 font-mono font-semibold">{it.ticker}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{it.period}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {it.epsActual?.toFixed(2) ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {it.epsExpected?.toFixed(2) ?? "—"}
                          </TableCell>
                          <TableCell
                            className={`pr-4 text-right tabular-nums ${
                              surprise > 0
                                ? "text-emerald-500"
                                : surprise < 0
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              <SurpriseIcon className="h-3 w-3" />
                              {surprise > 0 ? "+" : ""}
                              {surprise.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="pr-4 text-right tabular-nums text-xs">
                            {it.revenueActual ? fmtCurrency(it.revenueActual, { compact: true }) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
