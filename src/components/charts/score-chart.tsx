"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ScoreChartProps {
  data: { name: string; value: number; label?: string }[];
  height?: number;
}

export function ScoreChart({ data, height = 200 }: ScoreChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          tickLine={false}
          axisLine={false}
        />
        <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={28} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { name: string; value: number; label?: string };
            return (
              <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="font-medium">{p.label ?? p.name}</div>
                <div className="text-muted-foreground">Score: {p.value}/100</div>
              </div>
            );
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.value >= 70
                  ? "hsl(var(--chart-2))"
                  : d.value >= 50
                    ? "hsl(var(--chart-4))"
                    : "hsl(var(--chart-5))"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
