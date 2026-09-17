import { EmptyState } from "@/components/entry-list";
import { HabitList } from "@/components/habit-list";
import { listHabits } from "@/lib/entries/repository";
import { dayKey, recentDayKeys } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function HabitPage() {
  const todayKey = dayKey();
  const recentKeys = recentDayKeys(30);
  const habits = await listHabits({ todayKey, recentKeys });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="px-1 text-lg font-semibold">Habit</h1>

      {habits.length === 0 ? (
        <EmptyState>
          Belum ada kebiasaan. Ketuk <span className="font-medium text-foreground">+</span> lalu
          pilih Habit — judulnya jadi nama kebiasaannya.
        </EmptyState>
      ) : (
        <HabitList habits={habits} todayKey={todayKey} />
      )}
    </div>
  );
}
