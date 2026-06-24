"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  TrendingUp,
  TrendingDown,
  Newspaper,
  CalendarDays,
  Building2,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Loader2,
  Plus,
  Star,
} from "lucide-react";
import {
  fmtCurrency,
  fmtPct,
  fmtNumber,
  fmtCompact,
  fmtDate,
  timeAgo,
  ratingLabel,
  RATING_COLORS,
} from "@/lib/format";
import { PriceChart } from "@/components/charts/price-chart";
import { ScoreChart } from "@/components/charts/score-chart";
import { toast } from "sonner";
import { useAuth, useAuthFetch } from "@/components/auth-provider";

interface CompanyDetail {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  ceo: string | null;
  employees: number | null;
  headquarters: string | null;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  beta: number | null;
  price: number | null;
  changePct: number;
  prices: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
  rating: {
    rating: string;
    score: number;
    confidence: number;
    valuation: number;
    growth: number;
    profitability: number;
    health: number;
    momentum: number;
    bullCase: string | null;
    bearCase: string | null;
    thesis: string | null;
    summary: string | null;
    risks: string | null;
    generatedAt: string;
  } | null;
  earnings: {
    id: string;
    period: string;
    reportDate: string;
    epsActual: number | null;
    epsExpected: number | null;
    revenueActual: number | null;
    surprise: number | null;
    transcriptSummary: string | null;
    keyTakeaways: string[];
    guidance: string | null;
  }[];
  filings: {
    id: string;
    type: string;
    period: string;
    filedAt: string;
    url: string | null;
    summary: string | null;
    risks: string[];
    sentiment: string | null;
  }[];
  news: {
    id: string;
    headline: string;
    summary: string | null;
    source: string | null;
    sentiment: string | null;
    publishedAt: string;
  }[];
  financials: {
    id: string;
    period: string;
    type: string;
    revenue: number | null;
    grossProfit: number | null;
    operatingIncome: number | null;
    netIncome: number | null;
    eps: number | null;
    freeCashFlow: number | null;
  }[];
}

export function CompanyDetailView({
  companyId,
  onBack,
}: {
  companyId: string;
  onBack: () => void;
}) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}`);
      if (!res.ok) throw new Error("Failed to load company");
      return res.json() as Promise<{ company: CompanyDetail }>;
    },
  });

  const c = data?.company;

  const generateReport = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync: true }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to generate report");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("AI analyst report generated");
      qc.invalidateQueries({ queryKey: ["company", companyId] });
      qc.invalidateQueries({ queryKey: ["reports-all"] });
      qc.invalidateQueries({ queryKey: ["reports-recent"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to generate report"),
  });

  const addToWatchlist = useMutation({
    mutationFn: async () => {
      const wlRes = await authFetch("/api/watchlists");
      const wlData = await wlRes.json();
      const firstWl = wlData.watchlists?.[0];
      if (!firstWl) throw new Error("Create a watchlist first");
      const res = await authFetch(`/api/watchlists/${firstWl.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (!res.ok) throw new Error("Failed to add");
    },
    onSuccess: () => {
      toast.success("Added to watchlist");
      qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Company not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">
            {c.ticker[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{c.ticker}</h1>
              <Badge variant="secondary" className="text-[10px]">{c.exchange}</Badge>
              {c.rating && (
                <Badge variant="outline" className={`text-[10px] ${RATING_COLORS[c.rating.rating]}`}>
                  {ratingLabel(c.rating.rating)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{c.name}</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="text-right">
            <div className="text-xl font-bold tabular-nums">{fmtCurrency(c.price)}</div>
            <div
              className={`text-xs font-medium ${
                c.changePct >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {fmtPct(c.changePct)}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => addToWatchlist.mutate()} disabled={addToWatchlist.isPending}>
            <Star className="mr-1.5 h-4 w-4" /> Watchlist
          </Button>
          <Button
            size="sm"
            onClick={() => generateReport.mutate()}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            {generateReport.isPending ? "Generating…" : "Generate AI report"}
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Market Cap" value={fmtCurrency(c.marketCap, { compact: true })} icon={<Building2 className="h-3.5 w-3.5" />} />
        <Stat label="P/E Ratio" value={c.peRatio?.toFixed(1) ?? "—"} icon={<DollarSign className="h-3.5 w-3.5" />} />
        <Stat label="EPS" value={c.eps ? `$${c.eps.toFixed(2)}` : "—"} icon={<BarChart3 className="h-3.5 w-3.5" />} />
        <Stat label="Div Yield" value={c.dividendYield ? `${c.dividendYield.toFixed(2)}%` : "—"} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <Stat label="Beta" value={c.beta?.toFixed(2) ?? "—"} icon={<BarChart3 className="h-3.5 w-3.5" />} />
        <Stat label="Employees" value={c.employees ? fmtCompact(c.employees) : "—"} icon={<Building2 className="h-3.5 w-3.5" />} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai">AI Analysis</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="filings">Filings</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Price History</CardTitle>
                <CardDescription className="text-xs">Last {c.prices.length} trading sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <PriceChart data={c.prices} height={280} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ProfileRow label="Sector" value={c.sector} />
                <ProfileRow label="Industry" value={c.industry} />
                <ProfileRow label="CEO" value={c.ceo} />
                <ProfileRow label="HQ" value={c.headquarters} />
                {c.website && (
                  <ProfileRow
                    label="Website"
                    value={
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {c.website.replace(/^https?:\/\//, "")}
                      </a>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About {c.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {c.description ?? "No description available."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {c.rating ? (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" /> AI Composite Rating
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Generated {timeAgo(c.rating.generatedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold">{c.rating.score}</div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">Composite Score</div>
                        <Progress value={c.rating.score} className="mt-1 h-2" />
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={`text-xs ${RATING_COLORS[c.rating.rating]}`}>
                          {ratingLabel(c.rating.rating)}
                        </Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {c.rating.confidence}% confidence
                        </div>
                      </div>
                    </div>
                    {c.rating.summary && (
                      <p className="rounded-md bg-muted/40 p-3 text-sm">{c.rating.summary}</p>
                    )}
                    <ScoreChart
                      data={[
                        { name: "Valuation", value: c.rating.valuation, label: "Valuation" },
                        { name: "Growth", value: c.rating.growth, label: "Growth" },
                        { name: "Profit", value: c.rating.profitability, label: "Profitability" },
                        { name: "Health", value: c.rating.health, label: "Financial Health" },
                        { name: "Momentum", value: c.rating.momentum, label: "Momentum" },
                      ]}
                      height={200}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Bull vs Bear</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                        <TrendingUp className="h-3.5 w-3.5" /> Bull Case
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.rating.bullCase ?? "—"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-red-500">
                        <TrendingDown className="h-3.5 w-3.5" /> Bear Case
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.rating.bearCase ?? "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {c.rating.thesis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Investment Thesis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-foreground/90">{c.rating.thesis}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
                <div className="font-medium">No AI analysis yet</div>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Generate a full AI analyst report — bull/bear cases, investment thesis,
                  composite score across 5 pillars, and an institutional-grade research note.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => generateReport.mutate()}
                  disabled={generateReport.isPending}
                >
                  {generateReport.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-4 w-4" />
                  )}
                  {generateReport.isPending ? "Generating…" : "Generate AI report"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financial Statements</CardTitle>
              <CardDescription className="text-xs">
                Revenue, profitability, and cash flow by period.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Period</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Gross Profit</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Op Income</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Net Income</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">FCF</th>
                    <th className="px-4 py-2 text-right pr-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">EPS</th>
                  </tr>
                </thead>
                <tbody>
                  {c.financials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No financial data.
                      </td>
                    </tr>
                  ) : (
                    c.financials.map((f) => (
                      <tr key={f.id} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="px-4 py-2 font-mono text-xs">{f.period}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(f.revenue, { compact: true })}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(f.grossProfit, { compact: true })}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(f.operatingIncome, { compact: true })}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(f.netIncome, { compact: true })}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(f.freeCashFlow, { compact: true })}</td>
                        <td className="px-4 py-2 pr-4 text-right tabular-nums">
                          {f.eps ? `$${f.eps.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filings" className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {c.filings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No SEC filings ingested yet.
                </CardContent>
              </Card>
            ) : (
              c.filings.map((f) => (
                <Card key={f.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">{f.type}</Badge>
                        <CardTitle className="text-sm font-medium">{f.period}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{fmtDate(f.filedAt)}</span>
                        {f.sentiment && (
                          <Badge
                            variant="outline"
                            className={
                              f.sentiment === "positive"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                                : f.sentiment === "negative"
                                  ? "border-red-500/30 bg-red-500/10 text-red-500"
                                  : "text-muted-foreground"
                            }
                          >
                            {f.sentiment}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {f.summary && <p className="text-sm text-muted-foreground">{f.summary}</p>}
                    {f.risks.length > 0 && (
                      <div>
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-500">
                          <AlertTriangle className="h-3 w-3" /> Key Risks
                        </div>
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {f.risks.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-500">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {c.earnings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No earnings data ingested yet.
                </CardContent>
              </Card>
            ) : (
              c.earnings.map((e) => {
                const surprise = e.surprise ?? 0;
                return (
                  <Card key={e.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-sm">{e.period}</CardTitle>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            surprise > 0
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                              : surprise < 0
                                ? "border-red-500/30 bg-red-500/10 text-red-500"
                                : "text-muted-foreground"
                          }
                        >
                          Surprise {surprise > 0 ? "+" : ""}{surprise.toFixed(2)}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">{fmtDate(e.reportDate)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="EPS Actual" value={e.epsActual?.toFixed(2) ?? "—"} />
                        <Stat label="EPS Est." value={e.epsExpected?.toFixed(2) ?? "—"} />
                        <Stat
                          label="Revenue"
                          value={e.revenueActual ? fmtCurrency(e.revenueActual, { compact: true }) : "—"}
                        />
                        <Stat
                          label="Surprise"
                          value={`${surprise > 0 ? "+" : ""}${surprise.toFixed(2)}`}
                        />
                      </div>
                      {e.transcriptSummary && (
                        <p className="text-sm text-muted-foreground">{e.transcriptSummary}</p>
                      )}
                      {e.keyTakeaways.length > 0 && (
                        <div>
                          <div className="mb-1 text-xs font-medium">Key Takeaways</div>
                          <ul className="space-y-0.5 text-xs text-muted-foreground">
                            {e.keyTakeaways.map((k, i) => (
                              <li key={i}>• {k}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {e.guidance && (
                        <div>
                          <div className="mb-1 text-xs font-medium">Guidance</div>
                          <p className="text-xs text-muted-foreground">{e.guidance}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="news" className="space-y-2">
          {c.news.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No news items ingested yet.
              </CardContent>
            </Card>
          ) : (
            c.news.map((n) => (
              <Card key={n.id}>
                <CardContent className="flex items-start gap-3 p-3">
                  <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium leading-tight">{n.headline}</div>
                      {n.sentiment && (
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] ${
                            n.sentiment === "positive"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                              : n.sentiment === "negative"
                                ? "border-red-500/30 bg-red-500/10 text-red-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {n.sentiment}
                        </Badge>
                      )}
                    </div>
                    {n.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.summary}</p>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {n.source ?? "Unknown"} · {timeAgo(n.publishedAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
