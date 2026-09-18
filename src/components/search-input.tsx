"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { TYPE_OPTIONS } from "@/lib/entries/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchInput({
  defaultQuery = "",
  defaultType,
}: {
  defaultQuery?: string;
  defaultType?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [type, setType] = useState<string | undefined>(defaultType);

  // Search adalah satu-satunya alasan halaman ini dibuka, jadi kursornya
  // langsung di kolom pencarian — di mobile ini menghemat satu ketukan.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce: tiap ketukan memicu query Postgres, dan di jaringan seluler
  // mengirimkannya per huruf membuat hasil berkedip-kedip.
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (type) params.set("type", type);
      router.replace(params.size ? `/search?${params}` : "/search", { scroll: false });
    }, 250);

    return () => clearTimeout(timer);
  }, [query, type, router]);

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        placeholder="Search titles and content…"
        aria-label="Search query"
        className="h-11 md:h-9"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={type ? "outline" : "default"}
          onClick={() => setType(undefined)}
        >
          Semua
        </Button>
        {TYPE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={type === option.value ? "default" : "outline"}
            onClick={() => setType(type === option.value ? undefined : option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
