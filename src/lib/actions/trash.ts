"use server";

import { revalidatePath } from "next/cache";

import { revalidateEntryViews } from "@/lib/actions/revalidate";
import { purgeEntry, purgeOldTrash, restoreEntry } from "@/lib/entries/repository";

export async function restoreEntryAction(id: string) {
  const count = await restoreEntry(id);
  if (count === 0) throw new Error("Entry tidak ada di tempat sampah.");
  revalidateEntryViews();
  revalidatePath("/trash");
}

export async function purgeEntryAction(id: string) {
  await purgeEntry(id);
  revalidatePath("/trash");
}

export async function emptyTrashAction() {
  // 0 hari = kosongkan semuanya sekarang, bukan hanya yang sudah lewat 30 hari.
  const count = await purgeOldTrash(0);
  revalidatePath("/trash");
  return count;
}
