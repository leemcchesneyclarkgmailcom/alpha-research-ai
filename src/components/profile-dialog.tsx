"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth-provider";
import { fmtNumber } from "@/lib/format";
import { toast } from "sonner";
import { Check, Sparkles, Zap } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    credits: 25,
    features: ["5 watchlists", "Daily AI ratings", "Earnings summaries", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    credits: 250,
    features: ["Unlimited watchlists", "Full analyst reports", "Bull/bear cases", "SEC filing analysis", "Priority queue"],
    highlighted: true,
  },
  {
    id: "institutional",
    name: "Institutional",
    price: "$499",
    credits: 10000,
    features: ["Everything in Pro", "API access", "Bulk report generation", "Custom data feeds", "Dedicated support"],
  },
];

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user, logout, setPlan } = useAuth();
  if (!user) return null;

  const used = user.creditsUsed ?? 0;
  const limit = user.creditsLimit ?? 25;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Account & Subscription</DialogTitle>
          <DialogDescription>
            Manage your profile, plan, and AI credit usage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10">
              {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name ?? "Analyst"}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
          <Badge variant="secondary" className="ml-auto uppercase">{user.plan}</Badge>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">AI credits used this period</span>
            <span className="font-medium">{fmtNumber(used, 0)} / {fmtNumber(limit, 0)}</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="text-sm font-medium">Subscription plans</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PLANS.map((p) => {
              const current = user.plan === p.id;
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col gap-2 rounded-lg border p-4 ${
                    p.highlighted ? "border-primary" : "border-border"
                  } ${current ? "bg-accent/50" : ""}`}
                >
                  {p.highlighted && (
                    <Badge className="absolute -top-2 right-3 gap-1">
                      <Sparkles className="h-3 w-3" /> Popular
                    </Badge>
                  )}
                  <div className="font-medium">{p.name}</div>
                  <div className="text-2xl font-bold">
                    {p.price}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    variant={current ? "outline" : p.highlighted ? "default" : "outline"}
                    className="mt-2 w-full"
                    disabled={current}
                    onClick={async () => {
                      await setPlan(p.id);
                      toast.success(`Switched to ${p.name} plan`);
                    }}
                  >
                    {current ? "Current plan" : `Upgrade to ${p.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              onOpenChange(false);
              toast.success("Signed out");
            }}
          >
            Sign out
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
