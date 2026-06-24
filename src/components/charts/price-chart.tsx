"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCurrency, fmtDate } from "@/lib/format";

interface PriceChartProps {
  data: { date: string; close: number; volume?: number }[];
  height?: number;
  showAxis?: boolean;
  color?: string;
}

export function PriceChart({
  data,
  height = 240,
  showAxis = true,
  color,
}: PriceChartProps) {
  const stroke = color ?? "hsl(var(--chart-1))";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        {showAxis && (
          <XAxis
            dataKey="date"
            tickFormatter={(d) => fmtDate(d).slice(0, 6)}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
        )}
        {showAxis && (
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={50}
          />
        )}
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { date: string; close: number };
            return (
              <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="font-medium">{fmtDate(p.date)}</div>
                <div className="text-muted-foreground">Close: {fmtCurrency(p.close)}</div>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={stroke}
          strokeWidth={2}
          fill="url(#priceGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
