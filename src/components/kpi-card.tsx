"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string | null;
  deltaPositive?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function KpiCard({ label, value, delta, deltaPositive, icon, className }: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {delta && (
          <div
            className={cn(
              "mt-1 text-xs font-medium",
              deltaPositive ? "text-emerald-500" : "text-red-500",
            )}
          >
            {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
