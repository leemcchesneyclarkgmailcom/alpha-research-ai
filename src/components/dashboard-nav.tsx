"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type View =
  | "overview"
  | "watchlists"
  | "portfolio"
  | "screener"
  | "ratings"
  | "reports"
  | "earnings"
  | "movers"
  | "news"
  | "admin"
  | "company";

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
  group: "research" | "markets" | "account";
}

export function DashboardNav({
  active,
  onSelect,
  items,
}: {
  active: View;
  onSelect: (v: View) => void;
  items: NavItem[];
}) {
  const groups: { key: NavItem["group"]; label: string }[] = [
    { key: "markets", label: "Markets" },
    { key: "research", label: "Research" },
    { key: "account", label: "Account" },
  ];

  return (
    <nav className="flex flex-col gap-6 p-3">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-1">
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </div>
          {items
            .filter((i) => i.group === g.group)
            .map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </div>
      ))}
    </nav>
  );
}

export type { NavItem };
