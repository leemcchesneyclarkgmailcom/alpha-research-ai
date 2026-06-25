"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { fmtCurrency, fmtDate, fmtCompact } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InsiderTx {
  id: string;
  insider: string;
  title: string | null;
  type: string;
  shares: number;
  price: number;
  value: number;
  filedAt: string;
  company: { id: string; ticker: string; name: string };
}

export function InsidersView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["insiders"],
    queryFn: async () => {
      const res = await fetch("/api/insiders?limit=50");
      return res.json() as Promise<{ insiders: InsiderTx[] }>;
    },
  });

  const insiders = data?.insiders ?? [];

  // Compute summary stats
  const totalBuyValue = insiders.filter((i) => i.type === "buy").reduce((s, i) => s + i.value, 0);
  const totalSellValue = insiders.filter((i) => i.type === "sell").reduce((s, i) => s + i.value, 0);
  const buyCount = insiders.filter((i) => i.type === "buy").length;
  const sellCount = insiders.filter((i) => i.type === "sell").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insider Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Track buys and sells by company insiders — CEOs, CFOs, directors, and officers.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> Buy Volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{fmtCurrency(totalBuyValue, { compact: true })}</div>
            <div className="text-xs text-muted-foreground">{buyCount} transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" /> Sell Volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{fmtCurrency(totalSellValue, { compact: true })}</div>
            <div className="text-xs text-muted-foreground">{sellCount} transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Buy/Sell Ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sellCount > 0 ? (buyCount / sellCount).toFixed(2) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {buyCount + sellCount} total transactions
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Net Flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalBuyValue - totalSellValue >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {totalBuyValue - totalSellValue >= 0 ? "+" : ""}
              {fmtCurrency(totalBuyValue - totalSellValue, { compact: true })}
            </div>
            <div className="text-xs text-muted-foreground">Buys minus sells</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription className="text-xs">
            Filed with the SEC within the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : insiders.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No insider transactions recorded yet. Run the collector to populate.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Ticker</TableHead>
                  <TableHead>Insider</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="pr-4 text-right">Filed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insiders.map((i) => (
                  <TableRow
                    key={i.id}
                    className="cursor-pointer"
                    onClick={() => onOpenCompany(i.company.id)}
                  >
                    <TableCell className="pl-4 font-mono font-semibold">{i.company.ticker}</TableCell>
                    <TableCell>{i.insider}</TableCell>
                    <TableCell className="text-muted-foreground">{i.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          i.type === "buy"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : "border-red-500/30 bg-red-500/10 text-red-500"
                        }`}
                      >
                        {i.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCompact(i.shares)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(i.price)}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${
                        i.type === "buy" ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {fmtCurrency(i.value, { compact: true })}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                      {fmtDate(i.filedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
