"use server";

import { revalidatePath } from "next/cache";

import { toggleHabitDay } from "@/lib/entries/repository";

export async function toggleHabitAction(habitId: string, dayKey: string) {
  const result = await toggleHabitDay(habitId, dayKey);
  revalidatePath("/habit");
  revalidatePath("/insight");
  return result;
}
