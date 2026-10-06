import { prisma } from "@/lib/prisma";

/**
 * Retensi trash: menghapus permanen entry yang sudah di-soft-delete lebih
 * dari `retentionDays`, untuk SELURUH user sekaligus.
 *
 * Dipanggil dari jalur SISTEM (cron), berjalan tanpa sesi — sengaja memakai
 * `prisma` mentah, bukan `scopedDb()` yang butuh `requireUserId()`.
 *
 * Beda dari pola sistem lain di aplikasi ini (lihat src/lib/entries/
 * sync-repository.ts): sync menulis data MILIK SATU owner tertentu, jadi
 * setiap querynya wajib menyebut `ownerId`. Retensi ini sebaliknya — sebuah
 * kebijakan yang seragam untuk semua user, dan TIDAK menyebut satu userId
 * pun secara sengaja. Ini bukan operasi yang membaca atau membocorkan data
 * siapa pun; ia hanya membuang baris yang sudah ditandai terhapus, apa pun
 * pemiliknya. Karena itu berkas ini TIDAK didaftarkan di SYSTEM_PATHS pada
 * scripts/check-gates.mjs — aturan "wajib menyebut ownerId" di sana memang
 * tidak berlaku untuk operasi lintas-user seperti ini.
 *
 * Cascade `onDelete: Cascade` pada EntryTag dan EntryLink (prisma/schema.prisma)
 * membersihkan baris terkait di level database — tidak ada langkah manual
 * tambahan yang diperlukan di sini, sama seperti purgeOldTrash per-user di
 * repository/trash.ts yang sudah lebih dulu memakai pola query ini.
 */
export async function purgeExpiredTrash(retentionDays = 30) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.entry.deleteMany({ where: { deletedAt: { lt: cutoff } } });
  return result.count;
}
