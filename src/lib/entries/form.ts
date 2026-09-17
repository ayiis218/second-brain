import { dateInputToIso } from "@/lib/time";
import type { EntryType } from "./schemas";

/**
 * Merakit `content` dari FormData sesuai tipe entry.
 *
 * Hanya merakit — validasinya tetap milik parseEntryContent() di repository.
 * Pemisahan ini disengaja: apa pun yang dirakit di sini, tidak ada jalan
 * masuk ke database tanpa melewati Zod.
 */
export function contentFromFormData(type: EntryType, formData: FormData) {
  const body = ((formData.get("body") as string | null) ?? "").trim();

  if (type === "journal") {
    const raw = formData.get("mood") as string | null;
    const mood = raw ? Number(raw) : undefined;
    return {
      body,
      ...(mood && Number.isInteger(mood) ? { mood } : {}),
    };
  }

  if (type === "task") {
    return {
      body,
      status: (formData.get("status") as string | null) ?? "todo",
      priority: (formData.get("priority") as string | null) ?? "medium",
      dueAt: dateInputToIso(formData.get("dueAt") as string | null),
    };
  }

  return { body };
}

export const MOOD_OPTIONS = [
  { value: 1, label: "Buruk", emoji: "😞" },
  { value: 2, label: "Kurang", emoji: "🙁" },
  { value: 3, label: "Biasa", emoji: "😐" },
  { value: 4, label: "Baik", emoji: "🙂" },
  { value: 5, label: "Bagus", emoji: "😄" },
] as const;

export const STATUS_OPTIONS = [
  { value: "todo", label: "Belum" },
  { value: "doing", label: "Jalan" },
  { value: "done", label: "Selesai" },
  { value: "cancelled", label: "Batal" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Rendah" },
  { value: "medium", label: "Sedang" },
  { value: "high", label: "Tinggi" },
] as const;

export const TYPE_OPTIONS = [
  { value: "note", label: "Catatan" },
  { value: "journal", label: "Journal" },
  { value: "task", label: "Task" },
  { value: "habit", label: "Habit" },
] as const;

export const TYPE_LABEL: Record<string, string> = {
  note: "Catatan",
  journal: "Journal",
  task: "Task",
  habit: "Habit",
  habit_log: "Centang habit",
  transaction: "Transaksi",
};
