"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Sparkles, Loader2, User, Bot } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function ChatView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; ticker: string; name: string }[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: companies } = useQuery({
    queryKey: ["companies-for-chat"],
    queryFn: async () => {
      const res = await fetch("/api/companies");
      return res.json() as Promise<{ companies: { id: string; ticker: string; name: string }[] }>;
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          companyId: companyId ?? undefined,
          conversationId: conversationId ?? undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Chat failed");
      }
      return res.json() as Promise<{ conversationId: string; message: string }>;
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: input },
        { role: "assistant", content: data.message },
      ]);
      setInput("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Chat failed"),
  });

  function send() {
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
  }

  const suggestions = [
    "What are the key risks for this company?",
    "Compare this company's valuation to its sector peers.",
    "What catalysts should I watch in the next 12 months?",
    "Is the current AI rating justified?",
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Chat Analyst</h1>
        <p className="text-sm text-muted-foreground">
          Ask any question about a company, sector, or investment thesis.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Company selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Context Company</CardTitle>
            <CardDescription className="text-xs">Optional — focuses the AI on one stock</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Search company…"
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value);
                setSearchResults(
                  (companies?.companies ?? [])
                    .filter((c) =>
                      c.ticker.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      c.name.toLowerCase().includes(e.target.value.toLowerCase()),
                    )
                    .slice(0, 5),
                );
              }}
            />
            {companySearch && searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCompanyId(c.id);
                      setCompanySearch("");
                      setSearchResults([]);
                    }}
                    className="flex w-full items-center gap-2 rounded-md border border-border p-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-mono font-semibold">{c.ticker}</span>
                    <span className="truncate text-xs text-muted-foreground">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
            {companyId && (
              <Badge variant="secondary" className="gap-1">
                {companies?.companies.find((c) => c.id === companyId)?.ticker}
                <button onClick={() => setCompanyId(null)} className="ml-1 text-xs hover:text-foreground">×</button>
              </Badge>
            )}
            <div className="pt-2">
              <CardDescription className="mb-1.5 text-xs">Try asking</CardDescription>
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="block w-full rounded-md border border-border p-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat panel */}
        <Card className="flex h-[600px] flex-col lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" /> Conversation
            </CardTitle>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMessages([]);
                  setConversationId(null);
                }}
                className="text-xs"
              >
                New chat
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef as never}>
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="font-medium">Ask the AI Analyst</div>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Get institutional-grade answers about stocks, earnings, SEC filings, valuation, and more.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                      {m.role === "assistant" && (
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-primary/10">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-3 text-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      {m.role === "user" && (
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-muted">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {sendMutation.isPending && (
                    <div className="flex gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-primary/10">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                        <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={sendMutation.isPending}
                />
                <Button onClick={send} disabled={sendMutation.isPending || !input.trim()} size="icon">
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
