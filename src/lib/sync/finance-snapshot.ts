import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * Tag cache tunggal untuk snapshot posisi — satu baris, satu tag.
 *
 * `unstable_cache`, bukan directive `use cache`: yang terakhir butuh flag
 * `cacheComponents: true` di next.config.ts, dan flag itu MENOLAK build
 * kalau ada `export const dynamic`/`runtime` eksplisit di page.tsx/route.ts
 * — persis yang diwajibkan gerbang "dynamic/runtime tidak eksplisit" di
 * scripts/check-gates.mjs (sudah terbukti menangkap 3 inkonsistensi nyata).
 * Dua hal itu tidak bisa dipakai bersamaan tanpa menulis ulang gerbang itu
 * untuk SELURUH app — di luar cakupan satu halaman Finance. `unstable_cache`
 * tidak butuh flag apa pun dan tidak menyentuh dynamic/runtime sama sekali.
 */
const SNAPSHOT_CACHE_TAG = "finance-snapshot";

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
    // Revalidasi LATAR BELAKANG (bukan seketika seperti updateTag) —
    // batasan unstable_cache, bukan pilihan. Permintaan berikutnya yang
    // melihat angka baru, bukan response yang sama persis; untuk tombol
    // "Sync now" yang hasilnya langsung dirender dari nilai balik aksinya
    // sendiri (lihat sync-button.tsx), ini tidak terasa.
    //
    // `{ expire: 0 }`: Next 16 mewajibkan argumen kedua (profil cacheLife
    // atau { expire }) — tidak ada lagi default "kedaluwarsa seketika"
    // yang implisit seperti versi sebelumnya. 0 detik adalah padanan
    // paling dekat dengan perilaku lama itu.
    revalidateTag(SNAPSHOT_CACHE_TAG, { expire: 0 });

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
    // lastError juga berubah lewat jalur gagal — kartu posisi harus
    // menunjukkan pesan error yang baru, bukan yang basi.
    revalidateTag(SNAPSHOT_CACHE_TAG, { expire: 0 });

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

/**
 * Baris mentah saja yang di-cache — BUKAN seluruh getFinanceSnapshot().
 *
 * `stale` di getFinanceSnapshot() dihitung dari `Date.now()`, nilai yang
 * sengaja TIDAK murni dan tidak boleh ikut dibekukan di dalam cache.
 * Dipisah di sini supaya "basi atau tidak" selalu dihitung ulang tiap
 * pemanggilan, sementara query database-nya yang mahal yang singgah di
 * cache. `['finance-snapshot-row']`: kunci cache statis — tidak ada
 * parameter yang membedakan satu pemanggilan dari yang lain (snapshot-nya
 * selalu satu baris untuk seluruh app), jadi tidak perlu diturunkan dari
 * argumen seperti pola `unstable_cache` pada umumnya.
 */
const getCachedSnapshotRow = unstable_cache(
  () => prisma.financeSnapshot.findUnique({ where: { source: FINANCE_SOURCE } }),
  ["finance-snapshot-row"],
  // Posisi berubah beberapa kali sehari lewat sync, bukan per-detik.
  { tags: [SNAPSHOT_CACHE_TAG], revalidate: 60 * 60 },
);

export async function getFinanceSnapshot(): Promise<StoredSnapshot> {
  const row = await getCachedSnapshotRow();

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

  // `unstable_cache` meng-serialize nilai baliknya lewat JSON untuk
  // disimpan — tidak seperti RSC payload biasa, JSON tidak punya tipe Date
  // sendiri, jadi apa yang keluar dari cache adalah STRING, bukan Date,
  // walau tipe Prisma-nya bilang DateTime. `new Date(...)` di sini
  // mengembalikannya jadi objek Date lagi sebelum `.getTime()` dipanggil —
  // tanpa ini, `row.capturedAt.getTime is not a function` dilempar setiap
  // kali nilainya datang dari cache (dibuktikan lewat verifikasi end-to-end,
  // bukan dugaan).
  const rawCapturedAt = new Date(row.capturedAt);
  const capturedAt = rawCapturedAt.getTime() === 0 ? null : rawCapturedAt;
  const fetchedAt = row.fetchedAt ? new Date(row.fetchedAt) : null;

  return {
    payload: parsed.success ? parsed.data : null,
    capturedAt,
    fetchedAt,
    lastError: row.lastError,
    stale:
      capturedAt !== null &&
      Date.now() - capturedAt.getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  };
}
