"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, ArrowUpDown } from "lucide-react";
import { fmtCurrency, fmtPct, ratingLabel, RATING_COLORS } from "@/lib/format";

interface ScreenerRow {
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
  rating: string | null;
  score: number | null;
}

export function ScreenerView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const [sector, setSector] = useState<string>("all");
  const [minMarketCap, setMinMarketCap] = useState("");
  const [maxPe, setMaxPe] = useState("");
  const [rating, setRating] = useState<string>("all");
  const [sort, setSort] = useState("marketCap");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const qs = new URLSearchParams({
    sort,
    order,
    limit: "100",
  });
  if (sector !== "all") qs.set("sector", sector);
  if (minMarketCap) qs.set("minMarketCap", minMarketCap);
  if (maxPe) qs.set("maxPe", maxPe);
  if (rating !== "all") qs.set("rating", rating);

  const { data, isLoading } = useQuery({
    queryKey: ["screener", qs.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/screener?${qs.toString()}`);
      return res.json() as Promise<{ rows: ScreenerRow[]; sectors: string[] }>;
    },
  });

  const rows = data?.rows ?? [];
  const sectors = data?.sectors ?? [];

  function toggleSort(col: string) {
    if (sort === col) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setOrder("desc");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Screener</h1>
        <p className="text-sm text-muted-foreground">
          Filter by sector, valuation, and AI rating. Click a row to view company detail.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Sector</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sectors</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min market cap ($B)</Label>
              <Input
                type="number"
                placeholder="0"
                value={minMarketCap}
                onChange={(e) => setMinMarketCap(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max P/E</Label>
              <Input
                type="number"
                placeholder="100"
                value={maxPe}
                onChange={(e) => setMaxPe(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">AI Rating</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any rating</SelectItem>
                  <SelectItem value="strong_buy">Strong Buy</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="strong_sell">Strong Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketCap">Market cap</SelectItem>
                  <SelectItem value="ticker">Ticker</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="peRatio">P/E ratio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Results <Badge variant="secondary" className="ml-1">{rows.length}</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Click any column header to invert sort order
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No companies match your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">
                    <SortBtn label="Ticker" col="ticker" sort={sort} order={order} onClick={toggleSort} />
                  </TableHead>
                  <TableHead>
                    <SortBtn label="Name" col="name" sort={sort} order={order} onClick={toggleSort} />
                  </TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Mkt Cap" col="marketCap" sort={sort} order={order} onClick={toggleSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="P/E" col="peRatio" sort={sort} order={order} onClick={toggleSort} />
                  </TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Chg%</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead className="pr-4 text-right">AI Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpenCompany(r.id)}>
                    <TableCell className="pl-4 font-mono font-semibold">{r.ticker}</TableCell>
                    <TableCell className="text-muted-foreground">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {r.sector ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCurrency(r.marketCap, { compact: true })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.peRatio ? r.peRatio.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtCurrency(r.price)}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        r.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {fmtPct(r.changePct)}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.rating ? (
                        <Badge variant="outline" className={`text-[10px] ${RATING_COLORS[r.rating]}`}>
                          {ratingLabel(r.rating)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {r.score !== null ? (
                        <span className="font-mono text-xs font-semibold">{r.score}</span>
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
    </div>
  );
}

function SortBtn({
  label,
  col,
  sort,
  order,
  onClick,
}: {
  label: string;
  col: string;
  sort: string;
  order: "asc" | "desc";
  onClick: (col: string) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(col);
      }}
      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider hover:text-foreground"
    >
      {label}
      {sort === col && (
        <ArrowUpDown className="h-3 w-3" style={{ transform: order === "asc" ? "scaleY(-1)" : "none" }} />
      )}
    </button>
  );
}
