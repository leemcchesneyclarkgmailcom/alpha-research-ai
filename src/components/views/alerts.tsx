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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, Bell, Plus, Trash2, Check, X } from "lucide-react";
import { fmtCurrency, fmtDate, timeAgo } from "@/lib/format";
import { toast } from "sonner";

interface Alert {
  id: string;
  companyId: string;
  type: string;
  threshold: number | null;
  active: boolean;
  triggeredAt: string | null;
  createdAt: string;
  company: { id: string; ticker: string; name: string };
}

export function AlertsView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", showAll],
    queryFn: async () => {
      const res = await fetch(`/api/alerts${showAll ? "?all=true" : ""}`);
      return res.json() as Promise<{ alerts: Alert[] }>;
    },
    refetchInterval: 15000,
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies-for-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      return res.json() as Promise<{ companies: { id: string; ticker: string; name: string }[] }>;
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert removed");
    },
  });

  const alerts = data?.alerts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Price Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Get notified when stocks hit your price targets, change ratings, or report earnings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show active only" : "Show all"}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New alert
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-medium">No alerts yet</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an alert to get notified when a stock hits your target price or changes rating.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Create alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Card key={a.id} className={a.triggeredAt ? "opacity-75" : ""}>
              <CardContent className="flex items-center gap-3 p-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-md ${
                    a.triggeredAt
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {a.triggeredAt ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenCompany(a.company.id)}
                      className="font-mono text-sm font-semibold hover:underline"
                    >
                      {a.company.ticker}
                    </button>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {a.type.replace("_", " ")}
                    </Badge>
                    {a.threshold && (
                      <span className="text-xs text-muted-foreground">
                        Target: {fmtCurrency(a.threshold)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.triggeredAt
                      ? `Triggered ${timeAgo(a.triggeredAt)}`
                      : `Created ${timeAgo(a.createdAt)}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => deleteAlert.mutate(a.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddAlertDialog open={addOpen} onOpenChange={setAddOpen} companies={companiesData?.companies ?? []} />
    </div>
  );
}

function AddAlertDialog({
  open,
  onOpenChange,
  companies,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companies: { id: string; ticker: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [type, setType] = useState("price_above");
  const [threshold, setThreshold] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          type,
          threshold: threshold ? parseFloat(threshold) : undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to create alert");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Alert created");
      qc.invalidateQueries({ queryKey: ["alerts"] });
      onOpenChange(false);
      setCompanyId("");
      setThreshold("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
          <DialogDescription>Get notified when a condition is met.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select company…" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-mono">{c.ticker}</span> — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Alert type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_above">Price rises above</SelectItem>
                <SelectItem value="price_below">Price falls below</SelectItem>
                <SelectItem value="rating_change">AI rating changes</SelectItem>
                <SelectItem value="earnings">Earnings reported</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(type === "price_above" || type === "price_below") && (
            <div className="space-y-1.5">
              <Label>Target price ($)</Label>
              <Input
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="250.00"
                required
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !companyId}>
              {create.isPending ? "Creating…" : "Create alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
