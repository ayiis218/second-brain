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
  { value: 1, label: "Bad", emoji: "😞" },
  { value: 2, label: "Poor", emoji: "🙁" },
  { value: 3, label: "Okay", emoji: "😐" },
  { value: 4, label: "Good", emoji: "🙂" },
  { value: 5, label: "Great", emoji: "😄" },
] as const;

export const STATUS_OPTIONS = [
  { value: "todo", label: "Todo" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

/**
 * Nama tipe entry mengikuti nama menu — Inggris — karena keduanya menamai hal
 * yang sama: badge "Task" pada entry adalah menu "Task" yang sama. Dulu peta
 * ini campur ("Catatan" bersama "Journal"), jadi satu entry bisa tampak
 * bertipe lain hanya karena bahasanya berganti.
 */
export const TYPE_OPTIONS = [
  { value: "note", label: "Note" },
  { value: "journal", label: "Journal" },
  { value: "task", label: "Task" },
  { value: "habit", label: "Habit" },
] as const;

export const TYPE_LABEL: Record<string, string> = {
  note: "Note",
  journal: "Journal",
  task: "Task",
  habit: "Habit",
  habit_log: "Habit check",
  transaction: "Transaction",
};
