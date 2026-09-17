"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { loadMoreEntriesAction } from "@/lib/actions";
import { EntryCard, EmptyState } from "@/components/entry-list";
import { Button } from "@/components/ui/button";
import type { EntryWithTags } from "@/lib/entries/repository";

/**
 * Daftar entry dengan "Muat lagi".
 *
 * Bukan infinite scroll: di timeline yang panjang, memuat otomatis membuat
 * orang tidak pernah sampai ke bawah halaman — dan tidak pernah tahu
 * datanya sudah habis atau belum.
 */
export function EntryFeed({
  initialEntries,
  initialCursor,
  type,
  tagId,
  empty,
}: {
  initialEntries: EntryWithTags[];
  initialCursor: string | null;
  type?: string;
  tagId?: string;
  empty: React.ReactNode;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      try {
        const next = await loadMoreEntriesAction({ cursor, type, tagId });
        setEntries((prev) => [...prev, ...next.entries]);
        setCursor(next.nextCursor);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memuat");
      }
    });
  }

  if (entries.length === 0) return <EmptyState>{empty}</EmptyState>;

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <EntryCard key={entry.id} entry={entry} index={i} />
      ))}

      {cursor ? (
        <Button
          type="button"
          size="touch"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={loadMore}
        >
          {pending ? "Memuat…" : "Muat lagi"}
        </Button>
      ) : (
        <p className="py-4 text-center text-xs text-muted-foreground">Sudah sampai ujung.</p>
      )}
    </div>
  );
}
