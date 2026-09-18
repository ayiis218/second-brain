"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { loadMoreEntriesAction } from "@/lib/actions";
import { EntryCard } from "@/components/entry-list";
import { Button } from "@/components/ui/button";
import type { EntryWithTags } from "@/lib/entries/repository";
import { formatDayLabel } from "@/lib/time";

/**
 * Lanjutan timeline. Halaman tambahan tidak dikelompokkan ulang per hari —
 * pengelompokan dilakukan server untuk halaman pertama, dan mengulangnya di
 * klien berarti menduplikasi aturan batas hari WIB di dua tempat.
 */
export function TimelineMore({
  initialCursor,
  type,
}: {
  initialCursor: string;
  type?: string;
}) {
  const [entries, setEntries] = useState<EntryWithTags[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      try {
        const next = await loadMoreEntriesAction({ cursor, type });
        setEntries((prev) => [...prev, ...next.entries]);
        setCursor(next.nextCursor);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memuat");
      }
    });
  }

  return (
    <div className="space-y-3">
      {entries.length > 0 ? (
        <section className="space-y-3">
          <h2 className="px-1 text-xs font-medium text-muted-foreground">
            Older — since {formatDayLabel(entries[0].occurredAt)}
          </h2>
          {entries.map((entry, i) => (
            <EntryCard key={entry.id} entry={entry} index={i} />
          ))}
        </section>
      ) : null}

      {cursor ? (
        <Button
          type="button"
          size="touch"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={loadMore}
        >
          {pending ? "Loading…" : "Load more"}
        </Button>
      ) : (
        <p className="py-2 text-center text-xs text-muted-foreground">Sudah sampai ujung.</p>
      )}
    </div>
  );
}
