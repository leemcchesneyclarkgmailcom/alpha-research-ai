"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Star,
  Wallet,
  Filter,
  Sparkles,
  FileText,
  CalendarDays,
  TrendingUp,
  Newspaper,
  Settings,
  Menu,
  X,
  Bell,
  Search as SearchIcon,
} from "lucide-react";
import { DashboardNav, NavItem, View } from "@/components/dashboard-nav";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OverviewView } from "@/components/views/overview";
import { WatchlistsView } from "@/components/views/watchlists";
import { PortfolioView } from "@/components/views/portfolio";
import { ScreenerView } from "@/components/views/screener";
import { RatingsView } from "@/components/views/ratings";
import { ReportsView } from "@/components/views/reports";
import { EarningsView } from "@/components/views/earnings";
import { MoversView } from "@/components/views/movers";
import { NewsView } from "@/components/views/news";
import { AdminView } from "@/components/views/admin";
import { CompanyDetailView } from "@/components/views/company-detail";
import { AuthDialog } from "@/components/auth-dialog";
import { ProfileDialog } from "@/components/profile-dialog";
import { CommandSearch } from "@/components/command-search";

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "research" },
  { id: "watchlists", label: "Watchlists", icon: Star, group: "research" },
  { id: "portfolio", label: "Portfolio", icon: Wallet, group: "research" },
  { id: "ratings", label: "AI Ratings", icon: Sparkles, group: "research" },
  { id: "reports", label: "Research Reports", icon: FileText, group: "research" },
  { id: "screener", label: "Stock Screener", icon: Filter, group: "markets" },
  { id: "movers", label: "Market Movers", icon: TrendingUp, group: "markets" },
  { id: "earnings", label: "Earnings Calendar", icon: CalendarDays, group: "markets" },
  { id: "news", label: "News & Sentiment", icon: Newspaper, group: "markets" },
  { id: "admin", label: "Admin / Jobs", icon: Settings, group: "account" },
];

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, loading } = useAuth();

  // Keyboard shortcut for search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openCompany(id: string) {
    setCompanyId(id);
    setView("company");
  }

  function navigate(v: View) {
    setView(v);
    setMobileNavOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-14 items-center gap-2 border-b border-border px-4">
              <Logo />
              <span className="font-semibold tracking-tight">Alpha Research AI</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DashboardNav active={view} onSelect={navigate} items={NAV_ITEMS} />
          </SheetContent>
        </Sheet>

        <Logo className="hidden md:flex" />
        <span className="hidden font-semibold tracking-tight md:inline">Alpha Research AI</span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 gap-2 px-3 text-sm text-muted-foreground sm:flex"
          >
            <SearchIcon className="h-4 w-4" />
            <span>Search company…</span>
            <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
          <ModeToggle />
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>

          {!loading && user ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2 pl-1 pr-3"
              onClick={() => setProfileOpen(true)}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-xs">
                  {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">{user.name ?? user.email}</span>
              <Badge variant="secondary" className="hidden text-[10px] uppercase md:inline">
                {user.plan}
              </Badge>
            </Button>
          ) : !loading ? (
            <Button size="sm" className="h-9" onClick={() => setAuthOpen(true)}>
              Sign in
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-border md:block">
          <DashboardNav active={view} onSelect={navigate} items={NAV_ITEMS} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
            <ViewRouter
              view={view}
              companyId={companyId}
              onOpenCompany={openCompany}
              onNavigate={navigate}
            />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-muted/20 px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} Alpha Research AI · For research and educational use only. Not investment advice.
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Autonomous pipeline active
            </span>
            <span className="hidden sm:inline">v1.0.0</span>
          </span>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <CommandSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectCompany={(id) => {
          openCompany(id);
          setSearchOpen(false);
        }}
      />
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      <span className="text-sm font-bold">α</span>
    </div>
  );
}

function ViewRouter({
  view,
  companyId,
  onOpenCompany,
  onNavigate,
}: {
  view: View;
  companyId: string | null;
  onOpenCompany: (id: string) => void;
  onNavigate: (v: View) => void;
}) {
  switch (view) {
    case "overview":
      return <OverviewView onOpenCompany={onOpenCompany} onNavigate={onNavigate} />;
    case "watchlists":
      return <WatchlistsView onOpenCompany={onOpenCompany} />;
    case "portfolio":
      return <PortfolioView onOpenCompany={onOpenCompany} />;
    case "screener":
      return <ScreenerView onOpenCompany={onOpenCompany} />;
    case "ratings":
      return <RatingsView onOpenCompany={onOpenCompany} />;
    case "reports":
      return <ReportsView onOpenCompany={onOpenCompany} />;
    case "earnings":
      return <EarningsView onOpenCompany={onOpenCompany} />;
    case "movers":
      return <MoversView onOpenCompany={onOpenCompany} />;
    case "news":
      return <NewsView onOpenCompany={onOpenCompany} />;
    case "admin":
      return <AdminView />;
    case "company":
      return companyId ? (
        <CompanyDetailView companyId={companyId} onBack={() => onNavigate("overview")} />
      ) : (
        <OverviewView onOpenCompany={onOpenCompany} onNavigate={onNavigate} />
      );
    default:
      return null;
  }
}
