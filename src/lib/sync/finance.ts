import { prisma } from "@/lib/prisma";
import {
  softDeleteFinanceEntries,
  upsertFinanceEntries,
  type FinanceTransaction,
} from "@/lib/entries/sync-repository";

/**
 * Menarik transaksi dari finance-dashboard (Fase 3).
 *
 * Kontraknya ada di rencana-aplikasi-second-brain.md §6.2. Dua hal yang
 * menentukan kebenarannya:
 *
 * 1. Cursor baru disimpan HANYA setelah seluruh loop selesai sukses. Job yang
 *    gagal di tengah mengulang dari cursor lama — aman karena upsert dan
 *    soft-delete sama-sama idempoten.
 * 2. Dua cursor terpisah untuk transaksi dan penghapusan. Satu cursor
 *    gabungan akan membuat penghapusan dilaporkan berulang tanpa henti
 *    ketika tidak ada transaksi baru.
 */

export const FINANCE_SOURCE = "finance";
const MAX_PAGES = 50;

type ExportResponse = {
  transactions: FinanceTransaction[];
  deleted: string[];
  nextTxCursor: string | null;
  nextDelCursor: string | null;
  hasMore: boolean;
  syncedAt: string;
};

export type SyncResult = {
  pages: number;
  created: number;
  updated: number;
  deleted: number;
  syncedAt: string | null;
};

async function fetchPage(
  baseUrl: string,
  token: string,
  cursors: { txCursor: string | null; delCursor: string | null },
): Promise<ExportResponse> {
  const url = new URL("/api/export/transactions", baseUrl);
  if (cursors.txCursor) url.searchParams.set("txCursor", cursors.txCursor);
  if (cursors.delCursor) url.searchParams.set("delCursor", cursors.delCursor);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    // Sync harus selalu melihat keadaan terbaru; cache HTTP tidak berlaku.
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `finance export ${response.status}: ${detail.slice(0, 200) || response.statusText}`,
    );
  }

  return (await response.json()) as ExportResponse;
}

/**
 * `ownerId` diselesaikan dari OWNER_EMAIL, bukan dari sesi: cron berjalan
 * tanpa sesi, dan finance-dashboard sendiri single-user sehingga seluruh
 * transaksinya memang milik pemilik.
 */
async function resolveOwnerId(): Promise<string> {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("OWNER_EMAIL belum diset.");

  const owner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!owner) throw new Error(`Pemilik dengan email ${email} belum pernah login.`);

  return owner.id;
}

export async function runFinanceSync(): Promise<SyncResult> {
  const baseUrl = process.env.FINANCE_API_URL?.trim();
  const token = process.env.FINANCE_SYNC_TOKEN?.trim();

  if (!baseUrl || !token) {
    throw new Error("FINANCE_API_URL atau FINANCE_SYNC_TOKEN belum diset.");
  }

  const ownerId = await resolveOwnerId();

  const state = await prisma.syncState.findUnique({ where: { source: FINANCE_SOURCE } });

  // Cursor kerja disimpan di memori selama loop. Yang di database baru
  // diperbarui di akhir, setelah semua halaman berhasil dikonsumsi.
  let txCursor = state?.txCursor ?? null;
  let delCursor = state?.delCursor ?? null;

  const result: SyncResult = { pages: 0, created: 0, updated: 0, deleted: 0, syncedAt: null };

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await fetchPage(baseUrl, token, { txCursor, delCursor });
      result.pages++;
      result.syncedAt = data.syncedAt;

      const written = await upsertFinanceEntries(ownerId, data.transactions);
      result.created += written.created;
      result.updated += written.updated;
      result.deleted += await softDeleteFinanceEntries(ownerId, data.deleted);

      txCursor = data.nextTxCursor;
      delCursor = data.nextDelCursor;

      if (!data.hasMore) break;
    }
  } catch (error) {
    // Cursor TIDAK disimpan saat gagal. Run berikutnya mengulang dari posisi
    // lama; pengulangan aman karena tulisannya idempoten.
    const message = error instanceof Error ? error.message : String(error);
    await prisma.syncState.upsert({
      where: { source: FINANCE_SOURCE },
      create: { source: FINANCE_SOURCE, lastRunAt: new Date(), lastError: message },
      update: { lastRunAt: new Date(), lastError: message },
    });
    throw error;
  }

  await prisma.syncState.upsert({
    where: { source: FINANCE_SOURCE },
    create: {
      source: FINANCE_SOURCE,
      txCursor,
      delCursor,
      lastRunAt: new Date(),
      lastError: null,
    },
    update: { txCursor, delCursor, lastRunAt: new Date(), lastError: null },
  });

  return result;
}

export async function getSyncState() {
  return prisma.syncState.findUnique({ where: { source: FINANCE_SOURCE } });
}
