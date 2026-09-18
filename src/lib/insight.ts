import { getContentField } from "@/lib/entries/content";
import { listEntries, listHabits } from "@/lib/entries/repository";
import { dayKey, recentDayKeys } from "@/lib/time";

/**
 * Insight = statistik DESKRIPTIF, bukan inferensi.
 *
 * Rencana induk §11.4: pada data personal harian, korelasi apa pun yang
 * muncul kemungkinan besar noise, dan menampilkannya sebagai temuan justru
 * menyesatkan. Jadi modul ini hanya menghitung dan membandingkan — tidak ada
 * satu pun angka di sini yang boleh disajikan sebagai sebab-akibat.
 */

export type PeriodStats = {
  entries: number;
  journals: number;
  notes: number;
  tasksDone: number;
  moodAverage: number | null;
  moodDays: number;
  goodMoodDays: number;
  habitChecks: number;
  spending: number | null;
};

export type Insight = {
  days: number;
  current: PeriodStats;
  previous: PeriodStats;
  habitStreaks: { name: string; streak: number }[];
};

function emptyStats(): PeriodStats {
  return {
    entries: 0,
    journals: 0,
    notes: 0,
    tasksDone: 0,
    moodAverage: null,
    moodDays: 0,
    goodMoodDays: 0,
    habitChecks: 0,
    spending: null,
  };
}

/**
 * `days` dihitung mundur dari hari ini dalam WIB, dan periode pembanding
 * adalah rentang sepanjang itu tepat sebelumnya — bukan "bulan lalu" yang
 * panjangnya berbeda-beda.
 */
export type InsightData = Awaited<ReturnType<typeof loadInsightData>>;

/**
 * Mengambil bahan mentahnya SEKALI.
 *
 * Sebelumnya tiap pemanggilan buildInsight menarik ulang seluruh entry,
 * seluruh habit_log, dan seluruh habit — jadi halaman yang menampilkan
 * ringkasan 7 dan 30 hari menjalankan query yang sama dua kali. Sekarang
 * pengambilannya dipisah dari perhitungannya.
 */
export async function loadInsightData(maxDays: number) {
  const [entries, habitLogs, habits] = await Promise.all([
    listEntries({ limit: 5000 }),
    listEntries({ type: "habit_log", limit: 5000 }),
    listHabits({ todayKey: dayKey(), recentKeys: [] }),
  ]);

  return {
    entries: entries.entries,
    habitLogs: habitLogs.entries,
    habits,
    maxDays,
  };
}

export function buildInsight(data: InsightData, days: number): Insight {
  const { entries, habitLogs, habits } = data;

  const currentKeys = new Set(recentDayKeys(days));
  const previousKeys = new Set(
    recentDayKeys(days * 2).filter((key) => !currentKeys.has(key)),
  );

  const current = emptyStats();
  const previous = emptyStats();
  const moodSum = { current: 0, previous: 0 };
  const spendingSum = { current: 0, previous: 0 };
  const hasSpending = { current: false, previous: false };

  for (const entry of entries) {
    const key = dayKey(entry.occurredAt);
    const bucket = currentKeys.has(key)
      ? "current"
      : previousKeys.has(key)
        ? "previous"
        : null;
    if (!bucket) continue;

    const stats = bucket === "current" ? current : previous;
    stats.entries++;

    if (entry.type === "journal") {
      stats.journals++;
      const mood = getContentField<number>(entry.content, "mood");
      if (typeof mood === "number") {
        stats.moodDays++;
        if (mood >= 4) stats.goodMoodDays++;
        moodSum[bucket] += mood;
      }
    }

    if (entry.type === "note") stats.notes++;

    if (entry.type === "task" && getContentField<string>(entry.content, "status") === "done") {
      stats.tasksDone++;
    }

    if (entry.type === "transaction") {
      const amount = Number(getContentField<string>(entry.content, "amount") ?? "0");
      const txType = getContentField<string>(entry.content, "txType");
      if (!Number.isNaN(amount) && txType !== "INCOME") {
        spendingSum[bucket] += amount;
        hasSpending[bucket] = true;
      }
    }
  }

  for (const log of habitLogs) {
    const key = getContentField<string>(log.content, "dayKey");
    if (!key) continue;
    if (currentKeys.has(key)) current.habitChecks++;
    else if (previousKeys.has(key)) previous.habitChecks++;
  }

  current.moodAverage = current.moodDays ? moodSum.current / current.moodDays : null;
  previous.moodAverage = previous.moodDays ? moodSum.previous / previous.moodDays : null;
  current.spending = hasSpending.current ? spendingSum.current : null;
  previous.spending = hasSpending.previous ? spendingSum.previous : null;

  return {
    days,
    current,
    previous,
    habitStreaks: habits
      .filter((habit) => habit.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .map((habit) => ({ name: habit.name, streak: habit.streak })),
  };
}
