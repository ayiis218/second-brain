import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseEntryContent } from "./schemas";

/**
 * Jalur tulis untuk proses SISTEM (cron sync), bukan untuk request user.
 *
 * Kenapa terpisah dari repository biasa: fungsi di sana mengambil identitas
 * dari sesi, sementara cron berjalan tanpa sesi sama sekali. Alih-alih
 * melonggarkan repository, jalur sistem dipisah dan diberi aturannya sendiri:
 *
 *   SETIAP query di berkas ini WAJIB menyertakan `userId: ownerId` secara
 *   eksplisit. Tidak ada extension yang menyuntikkannya di sini.
 *
 * `ownerId` selalu diterima sebagai parameter, tidak pernah ditebak dari
 * data — pemanggilnya yang bertanggung jawab menyelesaikannya dari
 * OWNER_EMAIL (lihat src/lib/sync/finance.ts).
 */

export type FinanceTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  category: string;
  amount: string;
  date: string;
  note: string | null;
  accountName: string;
  toAccountName: string | null;
  affectsBalance: boolean;
};

/** Teks yang diindeks search. Tanpa ini transaksi tidak akan pernah ketemu. */
function bodyOf(tx: FinanceTransaction) {
  return [tx.category, tx.note, tx.accountName, tx.toAccountName]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Menulis transaksi ke `entries`, idempoten.
 *
 * Kunci `(userId, source, sourceId)` membuat menjalankan job dua kali tidak
 * menggandakan data — inilah yang membuat job aman diulang setelah gagal di
 * tengah, dan alasan cursor baru disimpan setelah seluruh loop sukses.
 */
export async function upsertFinanceEntries(
  ownerId: string,
  transactions: FinanceTransaction[],
) {
  let created = 0;
  let updated = 0;

  for (const tx of transactions) {
    const content = parseEntryContent("transaction", {
      body: bodyOf(tx),
      txType: tx.type,
      category: tx.category,
      amount: tx.amount,
      accountName: tx.accountName,
      toAccountName: tx.toAccountName,
      affectsBalance: tx.affectsBalance,
    });

    const data = {
      type: "transaction",
      title: tx.category,
      content: content as Prisma.InputJsonValue,
      occurredAt: new Date(tx.date),
      // Transaksi yang dihidupkan lagi di sumbernya harus muncul kembali
      // di sini; tanpa ini ia tetap tersembunyi selamanya.
      deletedAt: null,
    };

    const existing = await prisma.entry.findFirst({
      where: { userId: ownerId, source: "FINANCE", sourceId: tx.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.entry.updateMany({
        where: { id: existing.id, userId: ownerId },
        data,
      });
      updated++;
    } else {
      await prisma.entry.create({
        data: { ...data, userId: ownerId, source: "FINANCE", sourceId: tx.id },
      });
      created++;
    }
  }

  return { created, updated };
}

/** Transaksi yang dihapus di sumbernya di-soft-delete di sini. */
export async function softDeleteFinanceEntries(ownerId: string, sourceIds: string[]) {
  if (sourceIds.length === 0) return 0;

  const result = await prisma.entry.updateMany({
    where: {
      userId: ownerId,
      source: "FINANCE",
      sourceId: { in: sourceIds },
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  return result.count;
}
