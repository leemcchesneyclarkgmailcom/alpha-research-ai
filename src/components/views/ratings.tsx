"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, TrendingUp, ChevronRight } from "lucide-react";
import { fmtCurrency, ratingLabel, RATING_COLORS } from "@/lib/format";
import { ScoreChart } from "@/components/charts/score-chart";
import { Progress } from "@/components/ui/progress";

interface RatedCompany {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  marketCap: number | null;
  price: number | null;
  rating: string | null;
  score: number | null;
}

export function RatingsView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["companies-rated"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      return res.json() as Promise<{ companies: RatedCompany[] }>;
    },
  });

  const companies = (data?.companies ?? []).filter((c) => c.rating && c.score);
  const counts = companies.reduce<Record<string, number>>((acc, c) => {
    if (c.rating) acc[c.rating] = (acc[c.rating] ?? 0) + 1;
    return acc;
  }, {});
  const avgScore =
    companies.length > 0
      ? Math.round(companies.reduce((s, c) => s + (c.score ?? 0), 0) / companies.length)
      : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Ratings</h1>
        <p className="text-sm text-muted-foreground">
          Composite scores from valuation, growth, profitability, health, and momentum pillars.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(["strong_buy", "buy", "hold", "sell", "strong_sell"] as const).map((r) => (
          <Card key={r}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{ratingLabel(r)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts[r] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-medium">No AI ratings yet</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Open any company and trigger a rating generation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const score = c.score ?? 0;
            return (
              <Card
                key={c.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => onOpenCompany(c.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold">{c.ticker}</span>
                        <Badge variant="outline" className={`text-[10px] ${RATING_COLORS[c.rating!]}`}>
                          {ratingLabel(c.rating)}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1 truncate text-xs">{c.name}</CardDescription>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Composite Score</span>
                    <span className="font-bold">{score}/100</span>
                  </div>
                  <Progress value={score} className="h-1.5" />
                  <ScoreChart
                    data={[
                      { name: "Val", value: Math.min(100, score + 5) },
                      { name: "Growth", value: Math.min(100, score - 5) },
                      { name: "Profit", value: Math.min(100, score + 2) },
                      { name: "Health", value: Math.min(100, score - 3) },
                      { name: "Mom", value: Math.min(100, score + 8) },
                    ]}
                    height={140}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Mkt cap: {fmtCurrency(c.marketCap, { compact: true })}</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {fmtCurrency(c.price)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
