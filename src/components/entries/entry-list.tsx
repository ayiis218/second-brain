"use client";

import Link from "next/link";

import { FadeIn } from "@/components/shared/fade-in";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getContentField, getEntryBody, getEntryMood } from "@/lib/entries/content";
import { MOOD_OPTIONS, TYPE_LABEL } from "@/lib/entries/form";
import { formatIdr } from "@/lib/format";
import type { EntryWithTags } from "@/lib/entries/repository";
import { formatDateTime } from "@/lib/time";

/**
 * Nominal transaksi hasil sync, bertanda + / − sesuai arah uangnya.
 *
 * Nilai yang bukan string dianggap "bukan transaksi" dan tidak ditampilkan —
 * tipe entry lain tidak punya `amount` sama sekali.
 */
function formatEntryAmount(content: unknown): string | null {
  const raw = getContentField<unknown>(content, "amount");
  if (typeof raw !== "string") return null;
  if (Number.isNaN(Number(raw))) return raw;

  const sign = getContentField<string>(content, "txType") === "INCOME" ? "+" : "−";
  return `${sign}${formatIdr(raw)}`;
}

/** Emoji untuk badge kartu; nilai mood mentahnya dipetakan lewat MOOD_OPTIONS. */
function moodEmoji(content: unknown): string | null {
  const mood = getEntryMood(content);
  return MOOD_OPTIONS.find((option) => option.value === mood)?.emoji ?? null;
}

export function EntryCard({ entry, index = 0 }: { entry: EntryWithTags; index?: number }) {
  const mood = moodEmoji(entry.content);
  const amount = formatEntryAmount(entry.content);

  return (
    <FadeIn index={index}>
      {/* Seluruh kartu adalah area ketuk — di layar sentuh, target sekecil
          judul saja terlalu mudah meleset. */}
      <Link href={`/entry/${entry.id}`} className="block">
        <Card className="transition-colors hover:border-ring">
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{TYPE_LABEL[entry.type] ?? entry.type}</Badge>
              {mood ? <span aria-label="Mood">{mood}</span> : null}
              {amount ? (
                <span className="font-medium tabular-nums">{amount}</span>
              ) : null}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(entry.occurredAt)}
              </span>
            </div>

            {entry.title ? <h3 className="font-medium leading-snug">{entry.title}</h3> : null}

            <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
              {getEntryBody(entry.content)}
            </p>

            {entry.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {entry.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </Link>
    </FadeIn>
  );
}

export function EntryList({ entries }: { entries: EntryWithTags[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState>
        Belum ada entri. Ketuk tombol{" "}
        <span className="font-medium text-foreground">+</span> di tengah bawah untuk menulis.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <EntryCard key={entry.id} entry={entry} index={i} />
      ))}
    </div>
  );
}
