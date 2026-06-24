"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Sparkles,
  FileText,
  ArrowRight,
  Calendar,
} from "lucide-react";
import {
  fmtCurrency,
  fmtPct,
  fmtCompact,
  fmtDateTime,
  timeAgo,
  ratingLabel,
  RATING_COLORS,
} from "@/lib/format";
import { View } from "@/components/dashboard-nav";
import { useAuthFetch } from "@/components/auth-provider";
import { Link } from "lucide-react";

interface CompanyRow {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  marketCap: number | null;
  peRatio: number | null;
  price: number | null;
  changePct: number;
  rating: string | null;
  score: number | null;
}

export function OverviewView({
  onOpenCompany,
  onNavigate,
}: {
  onOpenCompany: (id: string) => void;
  onNavigate: (v: View) => void;
}) {
  const authFetch = useAuthFetch();

  const { data: companiesData, isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await authFetch("/api/companies");
      return res.json() as Promise<{ companies: CompanyRow[] }>;
    },
  });

  const { data: movers } = useQuery({
    queryKey: ["movers"],
    queryFn: async () => {
      const res = await fetch("/api/movers?limit=5");
      return res.json() as Promise<{
        gainers: CompanyRow[];
        losers: CompanyRow[];
        active: CompanyRow[];
      }>;
    },
  });

  const { data: reportsData } = useQuery({
    queryKey: ["reports-recent"],
    queryFn: async () => {
      const res = await fetch("/api/reports?limit=5");
      return res.json() as Promise<{
        reports: Array<{
          id: string;
          title: string;
          rating: string | null;
          priceTarget: number | null;
          createdAt: string;
          company: { id: string; ticker: string; name: string };
        }>;
      }>;
    },
  });

  const { data: jobsData } = useQuery({
    queryKey: ["jobs-overview"],
    queryFn: async () => {
      const res = await fetch("/api/jobs?limit=6");
      return res.json() as Promise<{
        jobs: Array<{
          id: string;
          type: string;
          status: string;
          createdAt: string;
        }>;
      }>;
    },
    refetchInterval: 5000,
  });

  const companies = companiesData?.companies ?? [];
  const totalMarketCap = companies.reduce((s, c) => s + (c.marketCap ?? 0), 0);
  const gainers = companies.filter((c) => c.changePct > 0).length;
  const losers = companies.filter((c) => c.changePct < 0).length;
  const avgRating =
    companies.length > 0
      ? Math.round(
          companies.filter((c) => c.score).reduce((s, c) => s + (c.score ?? 0), 0) /
            Math.max(1, companies.filter((c) => c.score).length),
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Market Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time AI analysis across {companies.length} tracked equities. Last updated{" "}
            {timeAgo(new Date().toISOString())}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate("screener")}>
            <Activity className="mr-1.5 h-4 w-4" /> Screener
          </Button>
          <Button size="sm" onClick={() => onNavigate("reports")}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Browse reports
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total Market Cap"
          value={fmtCurrency(totalMarketCap, { compact: true })}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg AI Score"
          value={avgRating ? `${avgRating}/100` : "—"}
          icon={<Sparkles className="h-4 w-4" />}
          delta={`${companies.filter((c) => c.score).length} rated`}
          deltaPositive
        />
        <KpiCard
          label="Gainers / Losers"
          value={`${gainers} / ${losers}`}
          icon={<TrendingUp className="h-4 w-4" />}
          delta={gainers > losers ? "Breadth positive" : "Breadth negative"}
          deltaPositive={gainers >= losers}
        />
        <KpiCard
          label="Pipeline Activity"
          value={jobsData?.jobs.length ?? 0}
          icon={<Activity className="h-4 w-4" />}
          delta="Jobs in last 6"
          deltaPositive
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Watch table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Tracked Companies</CardTitle>
              <CardDescription className="text-xs">
                Live prices and AI composite scores
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("screener")}>
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingCompanies ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Ticker</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Chg%</TableHead>
                    <TableHead className="text-right pr-4">AI Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.slice(0, 8).map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => onOpenCompany(c.id)}
                    >
                      <TableCell className="pl-4 font-mono font-semibold">{c.ticker}</TableCell>
                      <TableCell className="truncate text-muted-foreground">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCurrency(c.price)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${
                          c.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {fmtPct(c.changePct)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {c.rating ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${RATING_COLORS[c.rating]}`}
                          >
                            {ratingLabel(c.rating)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Movers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Market Movers</CardTitle>
            <CardDescription className="text-xs">Top daily gainers & losers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                <TrendingUp className="h-3.5 w-3.5" /> Gainers
              </div>
              <div className="space-y-1">
                {(movers?.gainers ?? []).slice(0, 4).map((g) => (
                  <MoverRow key={g.id} row={g} onClick={() => onOpenCompany(g.id)} />
                ))}
                {!movers?.gainers?.length && <EmptyRow />}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-red-500">
                <TrendingDown className="h-3.5 w-3.5" /> Losers
              </div>
              <div className="space-y-1">
                {(movers?.losers ?? []).slice(0, 4).map((g) => (
                  <MoverRow key={g.id} row={g} onClick={() => onOpenCompany(g.id)} />
                ))}
                {!movers?.losers?.length && <EmptyRow />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent reports */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Latest AI Research</CardTitle>
              <CardDescription className="text-xs">
                Generated by the autonomous report pipeline
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("reports")}>
              All reports <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(reportsData?.reports ?? []).length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No reports yet. Generate one from any company detail page.
              </div>
            )}
            {(reportsData?.reports ?? []).map((r) => (
              <button
                key={r.id}
                onClick={() => onOpenCompany(r.company.id)}
                className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.company.ticker} · {timeAgo(r.createdAt)}
                  </div>
                </div>
                {r.rating && (
                  <Badge variant="outline" className={`text-[10px] ${RATING_COLORS[r.rating]}`}>
                    {ratingLabel(r.rating)}
                  </Badge>
                )}
                {r.priceTarget && (
                  <div className="text-right text-xs">
                    <div className="text-muted-foreground">PT</div>
                    <div className="font-medium">{fmtCurrency(r.priceTarget)}</div>
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Pipeline activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Activity</CardTitle>
            <CardDescription className="text-xs">
              Background jobs processed by the autonomous layer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(jobsData?.jobs ?? []).length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No jobs yet. The scheduler will enqueue collection jobs shortly.
              </div>
            )}
            {(jobsData?.jobs ?? []).map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between rounded-md border border-border p-2 text-xs"
              >
                <span className="font-mono text-muted-foreground">{j.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{timeAgo(j.createdAt)}</span>
                  <Badge
                    variant="outline"
                    className={
                      j.status === "completed"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                        : j.status === "failed"
                          ? "border-red-500/30 bg-red-500/10 text-red-500"
                          : j.status === "running"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                            : "border-border text-muted-foreground"
                    }
                  >
                    {j.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MoverRow({ row, onClick }: { row: CompanyRow; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold">{row.ticker}</span>
        <span className="truncate text-xs text-muted-foreground">{row.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-xs">{fmtCurrency(row.price)}</span>
        <span
          className={`w-16 text-right tabular-nums text-xs ${
            row.changePct >= 0 ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {fmtPct(row.changePct)}
        </span>
      </div>
    </button>
  );
}

function EmptyRow() {
  return <div className="px-2 py-2 text-xs text-muted-foreground">No data</div>;
}
