import { scopedDb } from "@/lib/db";
import { WITH_TAGS } from "./shared";

/**
 * Semua penghapusan sudah soft delete sejak Fase 1, tapi tanpa halaman ini
 * keunggulannya cuma teori: datanya masih ada, hanya tidak ada jalan
 * kembali kecuali lewat SQL.
 */
export async function listTrash(limit = 100) {
  const db = await scopedDb();

  return db.entry.findMany({
    where: { deletedAt: { not: null } },
    orderBy: [{ deletedAt: "desc" }],
    take: limit,
    include: WITH_TAGS,
  });
}

export async function restoreEntry(id: string) {
  const db = await scopedDb();
  const result = await db.entry.updateMany({
    where: { id, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  return result.count;
}

export async function purgeEntry(id: string) {
  const db = await scopedDb();
  // Hanya baris yang memang sudah di tempat sampah — supaya "hapus permanen"
  // tidak bisa dipakai melompati langkah soft delete.
  const result = await db.entry.deleteMany({ where: { id, deletedAt: { not: null } } });
  return result.count;
}

/**
 * Membersihkan isi tempat sampah yang lebih tua dari `days`.
 *
 * Tanpa ini, "soft" delete cuma berarti database yang membengkak diam-diam —
 * entry yang dihapus dua tahun lalu tetap ikut di setiap export.
 */
export async function purgeOldTrash(days = 30) {
  const db = await scopedDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.entry.deleteMany({ where: { deletedAt: { lt: cutoff } } });
  return result.count;
}
