"use client";

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search } from "lucide-react";

interface SearchResult {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
}

export function CommandSearch({
  open,
  onOpenChange,
  onSelectCompany,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectCompany: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        }
      } catch {
        /* ignore */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search by ticker or company name…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query ? "No companies found." : "Start typing to search companies."}
        </CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Companies">
            {results.map((r) => (
              <CommandItem
                key={r.id}
                value={`${r.ticker} ${r.name}`}
                onSelect={() => onSelectCompany(r.id)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="font-mono font-semibold">{r.ticker}</span>
                <span className="ml-2 text-muted-foreground">{r.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{r.exchange}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
