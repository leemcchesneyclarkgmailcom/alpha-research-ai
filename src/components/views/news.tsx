"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { timeAgo } from "@/lib/format";

interface NewsItem {
  id: string;
  ticker: string;
  name: string;
  headline: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  publishedAt: string;
}

const SENTIMENT_STYLES: Record<string, { icon: React.ReactNode; cls: string }> = {
  positive: { icon: <TrendingUp className="h-3 w-3" />, cls: "bg-emerald-500/10 text-emerald-500" },
  negative: { icon: <TrendingDown className="h-3 w-3" />, cls: "bg-red-500/10 text-red-500" },
  neutral: { icon: <Minus className="h-3 w-3" />, cls: "bg-muted text-muted-foreground" },
};

export function NewsView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const [filter, setFilter] = useState<string>("all");

  const qs = filter !== "all" ? `?sentiment=${filter}` : "";
  const { data, isLoading } = useQuery({
    queryKey: ["news", filter],
    queryFn: async () => {
      const res = await fetch(`/api/news${qs}&limit=50`);
      return res.json() as Promise<{ news: NewsItem[] }>;
    },
    refetchInterval: 30000,
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-lookup-news"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      return res.json() as Promise<{ companies: { id: string; ticker: string }[] }>;
    },
  });
  const lookup = new Map((companies?.companies ?? []).map((c) => [c.ticker, c.id]));

  const news = data?.news ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">News & Sentiment</h1>
          <p className="text-sm text-muted-foreground">
            AI-classified news flow with sentiment scoring per item.
          </p>
        </div>
        <div className="flex gap-1">
          {["all", "positive", "neutral", "negative"].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="text-xs capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : news.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Newspaper className="mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-medium">No news yet</div>
            <p className="mt-1 text-sm text-muted-foreground">
              The collector will ingest news items shortly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {news.map((n) => {
            const sent = n.sentiment ?? "neutral";
            const style = SENTIMENT_STYLES[sent] ?? SENTIMENT_STYLES.neutral;
            return (
              <Card
                key={n.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => {
                  const id = lookup.get(n.ticker);
                  if (id) onOpenCompany(id);
                }}
              >
                <CardContent className="flex items-start gap-3 p-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${style.cls}`}>
                    {style.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium leading-tight">{n.headline}</div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${style.cls}`}>
                        {sent}
                      </Badge>
                    </div>
                    {n.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.summary}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono font-semibold">{n.ticker}</span>
                      <span>·</span>
                      <span>{n.source ?? "Unknown source"}</span>
                      <span>·</span>
                      <span>{timeAgo(n.publishedAt)}</span>
                    </div>
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
