"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { fmtCurrency, fmtPct, fmtCompact } from "@/lib/format";

interface Mover {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  price: number | null;
  changePct: number;
  volume: number | null;
}

export function MoversView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["movers-full"],
    queryFn: async () => {
      const res = await fetch("/api/movers?limit=10");
      return res.json() as Promise<{
        gainers: Mover[];
        losers: Mover[];
        active: Mover[];
      }>;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market Movers</h1>
        <p className="text-sm text-muted-foreground">
          Top daily gainers, losers, and most actively traded stocks.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MoverColumn
            title="Top Gainers"
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
            items={data?.gainers ?? []}
            onOpenCompany={onOpenCompany}
          />
          <MoverColumn
            title="Top Losers"
            icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            items={data?.losers ?? []}
            onOpenCompany={onOpenCompany}
          />
          <MoverColumn
            title="Most Active"
            icon={<Activity className="h-4 w-4 text-primary" />}
            items={data?.active ?? []}
            onOpenCompany={onOpenCompany}
            showVolume
          />
        </div>
      )}
    </div>
  );
}

function MoverColumn({
  title,
  icon,
  items,
  onOpenCompany,
  showVolume,
}: {
  title: string;
  icon: React.ReactNode;
  items: Mover[];
  onOpenCompany: (id: string) => void;
  showVolume?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-2">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No data</div>
        ) : (
          items.map((m, i) => (
            <button
              key={m.id}
              onClick={() => onOpenCompany(m.id)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
            >
              <span className="w-5 text-center text-xs font-mono text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-semibold">{m.ticker}</div>
                <div className="truncate text-xs text-muted-foreground">{m.name}</div>
              </div>
              {m.sector && (
                <Badge variant="secondary" className="hidden text-[10px] sm:inline">
                  {m.sector}
                </Badge>
              )}
              <div className="text-right">
                <div className="text-sm tabular-nums">{fmtCurrency(m.price)}</div>
                <div
                  className={`text-xs tabular-nums ${
                    m.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {showVolume && m.volume
                    ? `${fmtCompact(m.volume)} vol`
                    : fmtPct(m.changePct)}
                </div>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
