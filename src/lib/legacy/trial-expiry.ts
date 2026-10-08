import { prisma } from "@/lib/prisma";

/**
 * Menandai trial Legacy Vault yang tanggalnya sudah lewat jadi EXPIRED,
 * untuk SELURUH user sekaligus. Pola yang sama persis dengan
 * src/lib/entries/trash-retention.ts — baca komentarnya untuk penjelasan
 * lengkap kenapa jalur sistem lintas-user tidak sama dengan jalur sistem
 * per-owner (sync finance).
 *
 * BUKAN gerbang keamanan: hasVaultAccess() di src/lib/legacy/access.ts
 * sudah menolak akses begitu trialEndsAt lewat, terlepas dari job ini
 * pernah berjalan atau belum (perbandingan tanggal langsung, bukan
 * bergantung pada status). Job ini murni menjaga `status` mencerminkan
 * kenyataan, supaya ringkasan funnel (listVaultAccessSummary) tidak perlu
 * menghitung ulang tanggal setiap kali dipanggil.
 *
 * Karena itu, sama seperti trash-retention.ts, berkas ini TIDAK
 * didaftarkan di SYSTEM_PATHS pada scripts/check-gates.mjs — tidak ada
 * ownerId tunggal untuk disaring, dan itu memang desainnya.
 */
export async function expireStaleTrials(): Promise<number> {
  const result = await prisma.legacyAccess.updateMany({
    where: { status: "TRIAL", trialEndsAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
