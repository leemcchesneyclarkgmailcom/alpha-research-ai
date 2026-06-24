"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star, Plus, X, Search } from "lucide-react";
import { useAuth, useAuthFetch } from "@/components/auth-provider";
import {
  fmtCurrency,
  fmtPct,
  ratingLabel,
  RATING_COLORS,
} from "@/lib/format";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface WatchlistCompany {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  price: number | null;
  changePct: number;
  rating: string | null;
  score: number | null;
  addedAt: string;
}

export function WatchlistsView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const [activeWl, setActiveWl] = useState<string | null>(null);
  const [newWlName, setNewWlName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const res = await authFetch("/api/watchlists");
      return res.json() as Promise<{
        watchlists: Array<{
          id: string;
          name: string;
          items: WatchlistCompany[];
        }>;
      }>;
    },
  });

  const watchlists = data?.watchlists ?? [];
  const current = activeWl
    ? watchlists.find((w) => w.id === activeWl)
    : watchlists[0];

  const createWl = useMutation({
    mutationFn: async (name: string) => {
      const res = await authFetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create watchlist");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] });
      setNewWlName("");
      toast.success("Watchlist created");
    },
    onError: () => toast.error("Could not create watchlist"),
  });

  const removeItem = useMutation({
    mutationFn: async ({ wlId, companyId }: { wlId: string; companyId: string }) => {
      await authFetch(`/api/watchlists/${wlId}/items?companyId=${companyId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlists</h1>
          <p className="text-sm text-muted-foreground">
            Track companies across multiple thematic watchlists.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)} disabled={!current}>
            <Plus className="mr-1.5 h-4 w-4" /> Add symbol
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Watchlist selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">My watchlists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newWlName.trim()) createWl.mutate(newWlName.trim());
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="New list name"
                value={newWlName}
                onChange={(e) => setNewWlName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 px-2">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
            <div className="space-y-1 pt-2">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              ) : (
                watchlists.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setActiveWl(w.id)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent ${
                      current?.id === w.id ? "bg-accent font-medium" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 text-muted-foreground" />
                      {w.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {w.items.length}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active watchlist content */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">
              {current?.name ?? "Select a watchlist"}
            </CardTitle>
            <CardDescription className="text-xs">
              {current ? `${current.items.length} symbols tracked` : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!current ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Create or select a watchlist to begin.
              </div>
            ) : current.items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                This watchlist is empty. Click “Add symbol” to add companies.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Ticker</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Chg%</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="pr-4 text-right">Added</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.items.map((it) => (
                    <TableRow key={it.id} className="cursor-pointer" onClick={() => onOpenCompany(it.companyId)}>
                      <TableCell className="pl-4 font-mono font-semibold">{it.ticker}</TableCell>
                      <TableCell className="text-muted-foreground">{it.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {it.sector ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtCurrency(it.price)}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${
                          it.changePct >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {fmtPct(it.changePct)}
                      </TableCell>
                      <TableCell className="text-center">
                        {it.rating ? (
                          <Badge variant="outline" className={`text-[10px] ${RATING_COLORS[it.rating]}`}>
                            {ratingLabel(it.rating)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                        {new Date(it.addedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="pr-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem.mutate({ wlId: current.id, companyId: it.companyId });
                          }}
                          aria-label="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AddSymbolDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        watchlistId={current?.id}
        query={searchQ}
        setQuery={setSearchQ}
      />
    </div>
  );
}

function AddSymbolDialog({
  open,
  onOpenChange,
  watchlistId,
  query,
  setQuery,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  watchlistId?: string;
  query: string;
  setQuery: (v: string) => void;
}) {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const [results, setResults] = useState<{ id: string; ticker: string; name: string }[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const res = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  async function add(ticker: string) {
    if (!watchlistId) return;
    const res = await authFetch(`/api/watchlists/${watchlistId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    if (res.ok) {
      toast.success(`${ticker} added to watchlist`);
      qc.invalidateQueries({ queryKey: ["watchlists"] });
      onOpenChange(false);
    } else {
      toast.error("Failed to add symbol");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add symbol to watchlist</DialogTitle>
          <DialogDescription>Search by ticker or company name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="AAPL, Apple, MSFT…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <ScrollArea className="h-72 rounded-md border border-border">
            {results.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {query ? "No matches." : "Type to search."}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => add(r.ticker)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent"
                  >
                    <div>
                      <div className="font-mono text-sm font-semibold">{r.ticker}</div>
                      <div className="text-xs text-muted-foreground">{r.name}</div>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
