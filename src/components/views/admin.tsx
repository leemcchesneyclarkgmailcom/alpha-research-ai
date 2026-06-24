"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Zap, Activity, RefreshCw, Trash2, Sparkles } from "lucide-react";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { KpiCard } from "@/components/kpi-card";

interface Job {
  id: string;
  type: string;
  status: string;
  payload: unknown;
  result: unknown;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

interface ScheduledTask {
  name: string;
  cron: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export function AdminView() {
  const qc = useQueryClient();

  const { data: jobsStats } = useQuery({
    queryKey: ["jobs-stats"],
    queryFn: async () => {
      const res = await fetch("/api/jobs/tick");
      return res.json() as Promise<{
        queued: number;
        running: number;
        completed: number;
        failed: number;
        tasks: ScheduledTask[];
      }>;
    },
    refetchInterval: 5000,
  });

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ["jobs-admin"],
    queryFn: async () => {
      const res = await fetch("/api/jobs?limit=50");
      return res.json() as Promise<{ jobs: Job[] }>;
    },
    refetchInterval: 5000,
  });

  const { data: cacheStats } = useQuery({
    queryKey: ["cache-stats"],
    queryFn: async () => {
      const res = await fetch("/api/cache");
      return res.json() as Promise<{ size: number; hits: number; misses: number; hitRate: number }>;
    },
    refetchInterval: 5000,
  });

  const triggerTick = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jobs/tick", { method: "POST" });
      if (!res.ok) throw new Error("Failed to trigger");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Pipeline triggered — collection jobs enqueued");
      qc.invalidateQueries({ queryKey: ["jobs-admin"] });
      qc.invalidateQueries({ queryKey: ["jobs-stats"] });
    },
    onError: () => toast.error("Failed to trigger pipeline"),
  });

  const clearCache = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cache", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Cache cleared");
      qc.invalidateQueries({ queryKey: ["cache-stats"] });
    },
  });

  const jobs = jobsData?.jobs ?? [];
  const tasks = jobsStats?.tasks ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin / Autonomous Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and trigger background jobs that keep the platform continuously fresh.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearCache.mutate()}
            disabled={clearCache.isPending}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear cache
          </Button>
          <Button
            size="sm"
            onClick={() => triggerTick.mutate()}
            disabled={triggerTick.isPending}
          >
            <Zap className="mr-1.5 h-4 w-4" /> Trigger pipeline now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Queued"
          value={jobsStats?.queued ?? 0}
          icon={<Activity className="h-4 w-4" />}
          delta="Awaiting worker"
          deltaPositive
        />
        <KpiCard
          label="Running"
          value={jobsStats?.running ?? 0}
          icon={<RefreshCw className="h-4 w-4" />}
          delta="In flight"
          deltaPositive
        />
        <KpiCard
          label="Completed"
          value={jobsStats?.completed ?? 0}
          icon={<Sparkles className="h-4 w-4" />}
          delta="Total successful"
          deltaPositive
        />
        <KpiCard
          label="Failed"
          value={jobsStats?.failed ?? 0}
          icon={<Database className="h-4 w-4" />}
          delta="Inspection needed"
          deltaPositive={(jobsStats?.failed ?? 0) === 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Scheduled tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduled Tasks</CardTitle>
            <CardDescription className="text-xs">
              Autonomous cron-style jobs that keep data fresh.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No scheduled tasks registered.
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{t.name}</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {t.cron}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Last: {t.lastRunAt ? timeAgo(t.lastRunAt) : "never"} · Next:{" "}
                      {t.nextRunAt ? timeAgo(t.nextRunAt) : "pending"}
                    </div>
                  </div>
                  <Switch checked={t.enabled} disabled />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Cache stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cache &amp; Performance</CardTitle>
            <CardDescription className="text-xs">
              In-memory cache hit rate and size.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Cache size</div>
                <div className="text-xl font-bold">{cacheStats?.size ?? 0}</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Hit rate</div>
                <div className="text-xl font-bold">
                  {cacheStats ? `${Math.round(cacheStats.hitRate * 100)}%` : "—"}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Hits</div>
                <div className="text-xl font-bold">{cacheStats?.hits ?? 0}</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Misses</div>
                <div className="text-xl font-bold">{cacheStats?.misses ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Jobs</CardTitle>
          <CardDescription className="text-xs">
            Live tail of the background job queue.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No jobs yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead className="pr-4">Result / Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="pl-4 font-mono text-xs">{j.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          j.status === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                            : j.status === "failed"
                              ? "border-red-500/30 bg-red-500/10 text-red-500"
                              : j.status === "running"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                                : "text-muted-foreground"
                        }
                      >
                        {j.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {j.startedAt ? fmtDateTime(j.startedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {j.endedAt ? fmtDateTime(j.endedAt) : "—"}
                    </TableCell>
                    <TableCell className="pr-4 max-w-md truncate text-xs">
                      {j.error ? (
                        <span className="text-red-500">{j.error}</span>
                      ) : j.result ? (
                        <span className="text-muted-foreground">
                          {typeof j.result === "string" ? j.result : JSON.stringify(j.result)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
