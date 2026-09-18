import type { Prisma } from "@prisma/client";

import { scopedDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth-user";
import { parseEntryContent } from "../schemas";

export type HabitSummary = {
  id: string;
  name: string;
  doneToday: boolean;
  streak: number;
  recentDays: { dayKey: string; done: boolean }[];
};

/**
 * Streak = jumlah hari berurutan sampai hari ini.
 *
 * Hari ini yang belum dicentang TIDAK memutus streak — kalau begitu, streak
 * akan terlihat nol setiap pagi sebelum kebiasaannya dikerjakan. Hitungannya
 * dimulai dari hari ini kalau sudah dicentang, kalau belum dari kemarin.
 */
function computeStreak(done: ReadonlySet<string>, todayKey: string): number {
  const cursor = new Date(`${todayKey}T00:00:00Z`);
  if (!done.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!done.has(key)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function listHabits(opts: {
  todayKey: string;
  recentKeys: string[];
}): Promise<HabitSummary[]> {
  const db = await scopedDb();

  const [habits, logs] = await Promise.all([
    db.entry.findMany({
      where: { type: "habit", deletedAt: null },
      orderBy: [{ occurredAt: "asc" }],
    }),
    db.entry.findMany({
      where: { type: "habit_log", deletedAt: null },
      select: { content: true },
    }),
  ]);

  const doneByHabit = new Map<string, Set<string>>();
  for (const log of logs) {
    const content = log.content as { habitId?: string; dayKey?: string } | null;
    if (!content?.habitId || !content.dayKey) continue;
    const set = doneByHabit.get(content.habitId) ?? new Set<string>();
    set.add(content.dayKey);
    doneByHabit.set(content.habitId, set);
  }

  return habits.map((habit) => {
    const done = doneByHabit.get(habit.id) ?? new Set<string>();
    return {
      id: habit.id,
      name: habit.title || "(tanpa nama)",
      doneToday: done.has(opts.todayKey),
      streak: computeStreak(done, opts.todayKey),
      recentDays: opts.recentKeys.map((dayKey) => ({ dayKey, done: done.has(dayKey) })),
    };
  });
}

/**
 * Mencentang atau membatalkan centang satu kebiasaan pada satu hari.
 *
 * Membatalkan memakai hard delete, bukan soft delete: baris yang di-soft-delete
 * tetap menempati unique index parsial hanya kalau ikut terhitung — dan karena
 * index-nya mengecualikan `deletedAt IS NOT NULL`, soft delete akan
 * meninggalkan riwayat centang yang tidak berarti apa-apa. Centang habit
 * adalah fakta biner per hari, bukan catatan yang perlu diarsipkan.
 */
export async function toggleHabitDay(habitId: string, dayKey: string) {
  const userId = await requireUserId();
  const db = await scopedDb();

  const habit = await db.entry.findFirst({
    where: { id: habitId, type: "habit", deletedAt: null },
    select: { id: true },
  });
  if (!habit) throw new Error("Habit tidak ditemukan.");

  // Filter JSON path, bukan memuat seluruh habit_log lalu menyaring di
  // memori. Lima kebiasaan selama setahun ≈ 1.800 baris, dan versi lama
  // menariknya semua setiap kali satu kotak dicentang.
  const match = await db.entry.findFirst({
    where: {
      type: "habit_log",
      deletedAt: null,
      AND: [
        { content: { path: ["habitId"], equals: habitId } },
        { content: { path: ["dayKey"], equals: dayKey } },
      ],
    },
    select: { id: true },
  });

  if (match) {
    await db.entry.deleteMany({ where: { id: match.id } });
    return { done: false };
  }

  const content = parseEntryContent("habit_log", { body: "", habitId, dayKey });
  await db.entry.create({
    data: {
      userId,
      type: "habit_log",
      title: null,
      content: content as Prisma.InputJsonValue,
      occurredAt: new Date(`${dayKey}T12:00:00Z`),
    },
  });
  return { done: true };
}
