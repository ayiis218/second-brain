import Link from "next/link";
import { CheckCircle2, Flame, ListTodo, Smile } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { listEntries, listHabits } from "@/lib/entries/repository";
import { dayKey, dayRange } from "@/lib/time";

/**
 * Ringkasan harian yang dijanjikan rencana induk §5 tapi belum pernah dibuat:
 * beranda sebelumnya cuma quick capture + daftar entry, jadi sama saja dengan
 * timeline yang lebih pendek — tidak ada alasan membukanya tiap pagi.
 */
function field<T>(content: unknown, key: string): T | null {
  if (content && typeof content === "object" && key in content) {
    return (content as Record<string, T>)[key] ?? null;
  }
  return null;
}

function Tile({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof ListTodo;
  label: string;
  value: string;
}) {
  return (
    <Link href={href} className="flex-1">
      <Card className="h-full transition-colors hover:border-ring">
        <CardContent className="space-y-1 p-3 text-center">
          <Icon className="mx-auto size-4 text-muted-foreground" aria-hidden />
          <p className="text-lg font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export async function TodaySummary() {
  const todayKey = dayKey();
  const { end: todayEnd } = dayRange();

  const [tasks, habits, journals] = await Promise.all([
    listEntries({ type: "task", limit: 500 }),
    listHabits({ todayKey, recentKeys: [] }),
    listEntries({ type: "journal", limit: 1 }),
  ]);

  const open = tasks.entries.filter(
    (t) => field<string>(t.content, "status") !== "done",
  );
  const dueToday = open.filter((t) => {
    const due = field<string>(t.content, "dueAt");
    return due ? new Date(due) <= todayEnd : false;
  });

  const habitsLeft = habits.filter((h) => !h.doneToday).length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  const lastMood = journals.entries[0]
    ? field<number>(journals.entries[0].content, "mood")
    : null;

  return (
    <div className="flex gap-2">
      <Tile
        href="/task"
        icon={ListTodo}
        label="to do"
        value={String(dueToday.length || open.length)}
      />
      <Tile
        href="/habit"
        icon={habitsLeft === 0 ? CheckCircle2 : Flame}
        label={habitsLeft === 0 ? "habits done" : "habits left"}
        value={habitsLeft === 0 ? String(bestStreak) : String(habitsLeft)}
      />
      <Tile
        href="/journal"
        icon={Smile}
        label="last mood"
        value={lastMood ? `${lastMood}/5` : "—"}
      />
    </div>
  );
}
