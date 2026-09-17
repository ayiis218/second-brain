"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";

import { toggleHabitAction } from "@/lib/actions";
import type { HabitSummary } from "@/lib/entries/repository";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function HabitRow({ habit, todayKey }: { habit: HabitSummary; todayKey: string }) {
  const [pending, startTransition] = useTransition();

  // Centang harus terasa instan di koneksi mobile; koreksi menyusul kalau
  // server menolak.
  const [done, setDone] = useOptimistic(habit.doneToday);
  const streak = done ? habit.streak || 1 : habit.streak;

  function toggle() {
    startTransition(async () => {
      setDone(!done);
      try {
        await toggleHabitAction(habit.id, todayKey);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memperbarui habit");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `Batalkan ${habit.name} hari ini` : `Centang ${habit.name} hari ini`}
            disabled={pending}
            onClick={toggle}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg border text-lg transition-colors md:size-9",
              done ? "border-primary bg-primary text-primary-foreground" : "border-input",
            )}
          >
            {done ? "✓" : ""}
          </button>

          <Link href={`/entry/${habit.id}`} className="min-w-0 flex-1">
            <p className="truncate font-medium">{habit.name}</p>
          </Link>

          {streak > 0 ? (
            <span className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
              <Flame className="size-4" aria-hidden />
              {streak}
            </span>
          ) : null}
        </div>

        {/* Heatmap 30 hari — CSS grid, bukan pustaka chart. */}
        <div className="grid grid-cols-30 gap-0.5" aria-hidden>
          {habit.recentDays.map((day) => (
            <div
              key={day.dayKey}
              title={day.dayKey}
              className={cn(
                "aspect-square rounded-[2px] border",
                day.done ? "border-primary bg-primary/70" : "bg-muted",
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HabitList({
  habits,
  todayKey,
}: {
  habits: HabitSummary[];
  todayKey: string;
}) {
  return (
    <div className="space-y-2">
      {habits.map((habit) => (
        <HabitRow key={habit.id} habit={habit} todayKey={todayKey} />
      ))}
    </div>
  );
}
