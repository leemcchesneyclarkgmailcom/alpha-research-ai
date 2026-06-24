"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wallet, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useAuthFetch } from "@/components/auth-provider";
import { fmtCurrency, fmtPct, fmtCompact } from "@/lib/format";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Holding {
  id: string;
  companyId: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  price: number;
  value: number;
  gain: number;
  gainPct: number;
}

interface Portfolio {
  id: string;
  name: string;
  holdings: Holding[];
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPct: number;
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export function PortfolioView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await authFetch("/api/portfolio/holdings");
      return res.json() as Promise<{ portfolios: Portfolio[] }>;
    },
  });

  const portfolio = data?.portfolios?.[0];

  const addHolding = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/portfolio/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          shares: parseFloat(shares),
          avgCost: parseFloat(avgCost),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to add holding");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Holding added");
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      setAddOpen(false);
      setTicker("");
      setShares("");
      setAvgCost("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add holding"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Track positions, cost basis, and unrealized gains.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add holding
        </Button>
      </div>

      {!portfolio || portfolio.holdings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-medium">No holdings yet</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first position to start tracking P&amp;L.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add holding
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmtCurrency(portfolio.totalValue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Cost Basis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmtCurrency(portfolio.totalCost)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Unrealized P&amp;L
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    portfolio.totalGain >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {portfolio.totalGain >= 0 ? "+" : ""}
                  {fmtCurrency(portfolio.totalGain)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Return %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    portfolio.totalGainPct >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {fmtPct(portfolio.totalGainPct)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Holdings</CardTitle>
                <CardDescription className="text-xs">{portfolio.holdings.length} positions</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Ticker</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead className="text-right">Last</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right pr-4">P&amp;L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.holdings.map((h) => (
                      <TableRow key={h.id} className="cursor-pointer" onClick={() => onOpenCompany(h.companyId)}>
                        <TableCell className="pl-4 font-mono font-semibold">{h.ticker}</TableCell>
                        <TableCell className="text-muted-foreground">{h.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{h.shares}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtCurrency(h.avgCost)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtCurrency(h.price)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtCurrency(h.value)}</TableCell>
                        <TableCell
                          className={`pr-4 text-right tabular-nums ${
                            h.gain >= 0 ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          <div>
                            {h.gain >= 0 ? "+" : ""}
                            {fmtCurrency(h.gain)}
                          </div>
                          <div className="text-[10px]">{fmtPct(h.gainPct)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Allocation</CardTitle>
                <CardDescription className="text-xs">By market value</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={portfolio.holdings.map((h) => ({ name: h.ticker, value: h.value }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {portfolio.holdings.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => fmtCurrency(v)}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {portfolio.holdings.map((h, i) => (
                    <div key={h.id} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="font-mono">{h.ticker}</span>
                      <span className="ml-auto text-muted-foreground">
                        {fmtCompact(h.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add holding</DialogTitle>
            <DialogDescription>Record a position in your portfolio.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addHolding.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  step="any"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="100"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Avg cost</Label>
                <Input
                  id="cost"
                  type="number"
                  step="any"
                  value={avgCost}
                  onChange={(e) => setAvgCost(e.target.value)}
                  placeholder="150.00"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addHolding.isPending}>
                {addHolding.isPending ? "Saving…" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
