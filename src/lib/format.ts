/** Display formatters shared across the dashboard. */

export function fmtCurrency(n: number | null | undefined, opts?: { compact?: boolean }) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (opts?.compact && Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (opts?.compact && Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (opts?.compact && Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtNumber(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(n: number | null | undefined, withSign = true) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function fmtCompact(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(date);
}

export const RATING_COLORS: Record<string, string> = {
  strong_buy: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  buy: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  hold: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  sell: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  strong_sell: "bg-red-500/15 text-red-500 border-red-500/30",
};

export const RATING_LABELS: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  sell: "Sell",
  strong_sell: "Strong Sell",
};

export function ratingLabel(r: string | null | undefined) {
  if (!r) return "—";
  return RATING_LABELS[r] ?? r;
}
