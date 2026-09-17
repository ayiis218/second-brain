import { EmptyState, EntryCard } from "@/components/entry-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOOD_OPTIONS } from "@/lib/entries/form";
import { listEntries } from "@/lib/entries/repository";
import { dayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

function moodOf(content: unknown): number | null {
  if (content && typeof content === "object" && "mood" in content) {
    const mood = (content as { mood: unknown }).mood;
    return typeof mood === "number" ? mood : null;
  }
  return null;
}

/**
 * Strip 30 hari terakhir. Dibuat dengan CSS grid, bukan pustaka chart —
 * satu baris kotak berwarna tidak sepadan dengan tambahan bundle.
 */
function MoodStrip({ moodByDay }: { moodByDay: Map<string, number> }) {
  const days: { key: string; mood: number | null }[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = dayKey(date);
    days.push({ key, mood: moodByDay.get(key) ?? null });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mood 30 hari terakhir</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-15 gap-1 sm:grid-cols-30">
          {days.map((day) => {
            const option = MOOD_OPTIONS.find((o) => o.value === day.mood);
            return (
              <div
                key={day.key}
                title={option ? `${day.key}: ${option.label}` : `${day.key}: belum diisi`}
                aria-label={option ? `${day.key}: ${option.label}` : `${day.key}: belum diisi`}
                className="flex aspect-square items-center justify-center rounded-sm border text-[10px]"
                style={
                  day.mood
                    ? // Skala 1-5 dipetakan ke opasitas warna primary.
                      { backgroundColor: `color-mix(in oklab, var(--primary) ${day.mood * 18}%, transparent)` }
                    : undefined
                }
              >
                {option?.emoji ?? ""}
              </div>
            );
          })}
        </div>
        {/* Hari kosong sengaja dibiarkan kosong, bukan diisi nilai default —
            "tidak menulis journal" bukan berarti mood biasa saja. */}
        <p className="text-xs text-muted-foreground">Kotak kosong berarti belum ada journal.</p>
      </CardContent>
    </Card>
  );
}

export default async function JournalPage() {
  const entries = await listEntries({ type: "journal", limit: 200 });

  const moodByDay = new Map<string, number>();
  for (const entry of entries) {
    const mood = moodOf(entry.content);
    const key = dayKey(entry.occurredAt);
    if (mood && !moodByDay.has(key)) moodByDay.set(key, mood);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="px-1 text-lg font-semibold">Journal</h1>

      <MoodStrip moodByDay={moodByDay} />

      {entries.length === 0 ? (
        <EmptyState>
          Belum ada journal. Ketuk <span className="font-medium text-foreground">+</span> lalu
          pilih Journal.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <EntryCard key={entry.id} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
