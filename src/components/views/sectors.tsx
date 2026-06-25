"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { fmtCurrency, fmtPct, ratingLabel, RATING_COLORS } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Sector {
  sector: string;
  companyCount: number;
  totalMarketCap: number;
  avgChangePct: number;
  avgScore: number | null;
  gainers: number;
  losers: number;
  companies: {
    id: string;
    ticker: string;
    name: string;
    marketCap: number | null;
    peRatio: number | null;
    price: number | null;
    changePct: number;
    rating: string | null;
    score: number | null;
  }[];
}

export function SectorsView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const res = await fetch("/api/sectors");
      return res.json() as Promise<{ sectors: Sector[] }>;
    },
  });

  const sectors = data?.sectors ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sector Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate performance and AI ratings by sector, with peer company breakdowns.
        </p>
      </div>

      {/* Sector KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s) => (
            <Card key={s.sector}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{s.sector}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    {s.companyCount} {s.companyCount === 1 ? "stock" : "stocks"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Mkt Cap</span>
                  <span className="font-medium tabular-nums">{fmtCurrency(s.totalMarketCap, { compact: true })}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Change</span>
                  <span
                    className={`font-medium tabular-nums ${
                      s.avgChangePct >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {fmtPct(s.avgChangePct)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg AI Score</span>
                  <span className="font-medium tabular-nums">
                    {s.avgScore ? `${s.avgScore}/100` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Breadth</span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-500">{s.gainers} ▲</span>
                    <span className="text-red-500">{s.losers} ▼</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sector breakdown accordions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sector Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Expand each sector to see its constituent companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {sectors.map((s) => (
              <AccordionItem key={s.sector} value={s.sector}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between pr-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{s.sector}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{fmtCurrency(s.totalMarketCap, { compact: true })}</span>
                      <span className={s.avgChangePct >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {fmtPct(s.avgChangePct)}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-2">Ticker</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Mkt Cap</TableHead>
                        <TableHead className="text-right">P/E</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Chg%</TableHead>
                        <TableHead className="text-right pr-2">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.companies.map((c) => (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer"
                          onClick={() => onOpenCompany(c.id)}
                        >
                          <TableCell className="pl-2 font-mono font-semibold">{c.ticker}</TableCell>
                          <TableCell className="text-muted-foreground">{c.name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtCurrency(c.marketCap, { compact: true })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.peRatio?.toFixed(1) ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmtCurrency(c.price)}</TableCell>
                          <TableCell
                            className={`text-right tabular-nums ${
                              c.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                            }`}
                          >
                            {fmtPct(c.changePct)}
                          </TableCell>
                          <TableCell className="pr-2 text-right">
                            {c.rating ? (
                              <Badge variant="outline" className={`text-[10px] ${RATING_COLORS[c.rating]}`}>
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
