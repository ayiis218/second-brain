import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * Menarik posisi keuangan dari finance-dashboard.
 *
 * Berbeda sifatnya dari sync transaksi: ini foto keadaan, bukan aliran
 * perubahan. Tidak ada cursor, tombstone, maupun idempotensi yang perlu
 * dijaga — tiap pengambilan menimpa yang sebelumnya. Kalau gagal, ulangi.
 *
 * Kontraknya ada di
 * `finance-dashboard/rencana-dukungan-gudang-informasi.md` §6.
 */

export const FINANCE_SOURCE = "finance";

/**
 * Nominal divalidasi sebagai STRING, bukan number.
 *
 * Presisi `Decimal` tidak muat di float JS, dan sekali diubah jadi number
 * di jalur data, tidak ada cara memulihkannya. `Number()` hanya boleh
 * muncul saat memformat tampilan.
 */
const money = z.string();

export const snapshotSchema = z.object({
  capturedAt: z.string(),
  totals: z.object({
    wallet: money,
    assets: money,
    investments: money,
    piutang: money,
    utang: money,
    net: money,
  }),
  counts: z
    .object({
      accounts: z.number().int(),
      assets: z.number().int(),
      investments: z.number().int(),
      receivables: z.number().int(),
    })
    .optional(),
  oldestUpdatedAt: z.string().nullable().optional(),
  monthlyExpense: z
    .array(z.object({ month: z.string(), total: money }))
    .default([]),
});

export type FinanceSnapshotPayload = z.infer<typeof snapshotSchema>;

export async function runFinanceSnapshotSync(): Promise<FinanceSnapshotPayload> {
  const baseUrl = process.env.FINANCE_API_URL?.trim();
  const token = process.env.FINANCE_SYNC_TOKEN?.trim();

  if (!baseUrl || !token) {
    throw new Error("FINANCE_API_URL atau FINANCE_SYNC_TOKEN belum diset.");
  }

  try {
    const response = await fetch(new URL("/api/export/snapshot", baseUrl), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `finance snapshot ${response.status}: ${detail.slice(0, 200) || response.statusText}`,
      );
    }

    // Divalidasi, bukan dipercaya. Respons yang bentuknya berubah lebih baik
    // ditolak di sini daripada menghasilkan kartu berisi "undefined".
    const payload = snapshotSchema.parse(await response.json());

    await prisma.financeSnapshot.upsert({
      where: { source: FINANCE_SOURCE },
      create: {
        source: FINANCE_SOURCE,
        payload,
        capturedAt: new Date(payload.capturedAt),
        lastError: null,
      },
      update: {
        payload,
        capturedAt: new Date(payload.capturedAt),
        fetchedAt: new Date(),
        lastError: null,
      },
    });

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Kegagalan dicatat TANPA menghapus snapshot lama. Angka kemarin masih
    // lebih berguna daripada layar kosong — asal jelas kapan diambilnya.
    await prisma.financeSnapshot.upsert({
      where: { source: FINANCE_SOURCE },
      create: {
        source: FINANCE_SOURCE,
        payload: {},
        capturedAt: new Date(0),
        lastError: message,
      },
      update: { lastError: message, fetchedAt: new Date() },
    });

    throw error;
  }
}

/** Setelah sekian hari, angkanya tidak lagi layak dipakai mengambil keputusan. */
export const STALE_AFTER_DAYS = 7;

export type StoredSnapshot = {
  payload: FinanceSnapshotPayload | null;
  capturedAt: Date | null;
  fetchedAt: Date | null;
  lastError: string | null;
  /**
   * Dihitung di sini, bukan di komponen. `Date.now()` saat render adalah
   * fungsi tidak murni — hasilnya bisa berubah antar-render tanpa ada
   * data yang berubah.
   */
  stale: boolean;
};

export async function getFinanceSnapshot(): Promise<StoredSnapshot> {
  const row = await prisma.financeSnapshot.findUnique({
    where: { source: FINANCE_SOURCE },
  });

  if (!row) {
    return {
      payload: null,
      capturedAt: null,
      fetchedAt: null,
      lastError: null,
      stale: false,
    };
  }

  const parsed = snapshotSchema.safeParse(row.payload);
  const capturedAt = row.capturedAt.getTime() === 0 ? null : row.capturedAt;

  return {
    payload: parsed.success ? parsed.data : null,
    capturedAt,
    fetchedAt: row.fetchedAt,
    lastError: row.lastError,
    stale:
      capturedAt !== null &&
      Date.now() - capturedAt.getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  };
}
