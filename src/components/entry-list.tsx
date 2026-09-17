import Link from "next/link";

import { FadeIn } from "@/components/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MOOD_OPTIONS, TYPE_LABEL } from "@/lib/entries/form";
import type { EntryWithTags } from "@/lib/entries/repository";
import { formatDateTime } from "@/lib/time";

/** `content` sudah divalidasi Zod saat ditulis; setiap tipe menjamin `body`. */
function bodyOf(content: unknown): string {
  if (content && typeof content === "object" && "body" in content) {
    const body = (content as { body: unknown }).body;
    if (typeof body === "string") return body;
  }
  return "";
}

function amountOf(content: unknown): string | null {
  if (content && typeof content === "object" && "amount" in content) {
    const raw = (content as { amount: unknown }).amount;
    if (typeof raw !== "string") return null;
    const value = Number(raw);
    if (Number.isNaN(value)) return raw;
    const sign = (content as { txType?: string }).txType === "INCOME" ? "+" : "−";
    return `${sign}${new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value)}`;
  }
  return null;
}

function moodOf(content: unknown): string | null {
  if (content && typeof content === "object" && "mood" in content) {
    const mood = (content as { mood: unknown }).mood;
    const found = MOOD_OPTIONS.find((option) => option.value === mood);
    return found?.emoji ?? null;
  }
  return null;
}

export function EntryCard({ entry, index = 0 }: { entry: EntryWithTags; index?: number }) {
  const mood = moodOf(entry.content);
  const amount = amountOf(entry.content);

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
              {bodyOf(entry.content)}
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

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export function EntryList({ entries }: { entries: EntryWithTags[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState>
        Belum ada entry. Ketuk tombol{" "}
        <span className="font-medium text-foreground">+</span> di kanan bawah untuk menulis.
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
