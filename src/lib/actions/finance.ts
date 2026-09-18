"use server";

import { revalidatePath } from "next/cache";

import { isOwner } from "@/lib/auth-user";
import { runFinanceSnapshotSync } from "@/lib/sync/finance-snapshot";

/**
 * Menjalankan sync secara manual. Cron tetap jalur utamanya, tapi di plan
 * Hobby Vercel cron dibatasi sekali sehari — tanpa tombol ini pemilik harus
 * menunggu sampai besok untuk melihat transaksi terbaru.
 */
export async function syncFinanceAction() {
  if (!(await isOwner())) throw new Error("Hanya pemilik yang bisa menjalankan sync.");

  const payload = await runFinanceSnapshotSync();

  revalidatePath("/");
  revalidatePath("/finance");
  return payload;
}
