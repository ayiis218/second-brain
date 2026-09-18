"use server";

import { revalidateEntryViews } from "@/lib/actions/revalidate";
import { setTaskStatus } from "@/lib/entries/repository";

export async function toggleTaskDone(id: string, done: boolean) {
  await setTaskStatus(id, done ? "done" : "todo");
  revalidateEntryViews();
}
