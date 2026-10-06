import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { requireVaultAccess } from "./access";
import { deleteAttachmentBytes, getAttachmentBytes, putAttachmentBytes } from "./blob-storage";
import { open, openBytes, seal, sealBytes } from "./crypto";
import {
  isIncomplete,
  parseLegacyContent,
  type LegacyCategoryValue,
  type LegacyContent,
} from "./schemas";

/**
 * Satu-satunya modul yang menyentuh Prisma untuk LegacyItem.
 *
 * Tidak memakai scopedDb(): model Legacy sengaja tidak masuk daftar model
 * ber-scope di src/lib/db.ts, karena aturannya lebih ketat dari sekadar
 * per-user — modul ini butuh ENTITLEMENT, bukan cuma sesi. Setiap fungsi
 * di sini memanggil requireVaultAccess() lebih dulu, dan userId tetap
 * disertakan eksplisit di setiap query.
 */

export type LegacyItemView = {
  id: string;
  category: LegacyCategoryValue;
  content: LegacyContent;
  incomplete: boolean;
  updatedAt: Date;
};

/**
 * Jumlah item per kategori — TANPA dekripsi apa pun.
 *
 * Inilah gunanya `category` dibiarkan plaintext: halaman daftar bisa
 * menampilkan struktur vault tanpa menyentuh satu pun kunci.
 */
export async function countByCategory() {
  const userId = await requireVaultAccess();

  const rows = await prisma.legacyItem.groupBy({
    by: ["category"],
    where: { userId },
    _count: { _all: true },
  });

  return Object.fromEntries(rows.map((r) => [r.category, r._count._all])) as Record<
    string,
    number
  >;
}

export async function listByCategory(category: LegacyCategoryValue): Promise<LegacyItemView[]> {
  const userId = await requireVaultAccess();

  const rows = await prisma.legacyItem.findMany({
    where: { userId, category },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map((row) => {
    const content = open<LegacyContent>(row);
    return {
      id: row.id,
      category: row.category as LegacyCategoryValue,
      content,
      incomplete: isIncomplete(row.category, content),
      updatedAt: row.updatedAt,
    };
  });
}

export async function getLegacyItem(id: string): Promise<LegacyItemView | null> {
  const userId = await requireVaultAccess();

  const row = await prisma.legacyItem.findFirst({ where: { id, userId } });
  if (!row) return null;

  const content = open<LegacyContent>(row);
  return {
    id: row.id,
    category: row.category as LegacyCategoryValue,
    content,
    incomplete: isIncomplete(row.category, content),
    updatedAt: row.updatedAt,
  };
}

export async function createLegacyItem(input: {
  category: LegacyCategoryValue;
  content: unknown;
}) {
  const userId = await requireVaultAccess();
  const sealed = seal(parseLegacyContent(input.content));

  return prisma.legacyItem.create({
    data: { userId, category: input.category, ...sealed },
  });
}

export async function updateLegacyItem(input: {
  id: string;
  category: LegacyCategoryValue;
  content: unknown;
}) {
  const userId = await requireVaultAccess();
  const sealed = seal(parseLegacyContent(input.content));

  // updateMany + userId: baris milik siapa pun selain pemilik tidak akan
  // pernah tersentuh, meski id-nya ditebak benar.
  const result = await prisma.legacyItem.updateMany({
    where: { id: input.id, userId },
    data: { category: input.category, ...sealed },
  });

  return result.count;
}

export async function deleteLegacyItem(id: string) {
  const userId = await requireVaultAccess();

  // Objek biner lampiran HARUS dihapus eksplisit sebelum baris itemnya:
  // onDelete: Cascade di schema membersihkan baris LegacyAttachment di
  // Postgres, tapi tidak tahu apa-apa soal objek di Vercel Blob — tanpa
  // langkah ini, setiap item yang punya lampiran lalu dihapus meninggalkan
  // berkas terenkripsi yatim piatu di storage selamanya.
  const attachments = await prisma.legacyAttachment.findMany({
    where: { itemId: id, item: { userId } },
    select: { objectKey: true },
  });
  await Promise.all(attachments.map((a) => deleteAttachmentBytes(a.objectKey)));

  // Hard delete, bukan soft: vault ini kecil dan isinya sensitif. Menyimpan
  // salinan terenkripsi dari sesuatu yang sengaja dihapus justru menambah
  // permukaan risiko tanpa manfaat.
  const result = await prisma.legacyItem.deleteMany({ where: { id, userId } });
  return result.count;
}

/** Berapa item yang belum punya langkah klaim padahal kategorinya menuntut. */
export async function countIncomplete() {
  const userId = await requireVaultAccess();

  const rows = await prisma.legacyItem.findMany({
    where: { userId, category: { in: ["KEUANGAN", "INVESTASI", "ASET"] } },
  });

  return rows.filter((row) => isIncomplete(row.category, open<LegacyContent>(row))).length;
}


// --- Lampiran -----------------------------------------------------------

export type LegacyAttachmentView = {
  id: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

/** Memastikan item ini milik user yang sedang dilayani, tanpa mendekripsi isinya. */
async function findOwnedItem(itemId: string, userId: string) {
  return prisma.legacyItem.findFirst({ where: { id: itemId, userId }, select: { id: true } });
}

export async function listAttachments(itemId: string): Promise<LegacyAttachmentView[]> {
  const userId = await requireVaultAccess();

  // Filter lewat relasi item.userId, bukan query dua langkah: LegacyAttachment
  // sendiri tidak punya kolom userId (ownership-nya menumpang LegacyItem),
  // jadi inilah bentuk query yang MEMBUKTIKAN kepemilikan, bukan cuma
  // mengasumsikannya dari itemId yang diterima.
  const rows = await prisma.legacyAttachment.findMany({
    where: { itemId, item: { userId } },
    orderBy: { createdAt: "asc" },
    select: { id: true, mimeType: true, sizeBytes: true, createdAt: true },
  });

  return rows;
}

export async function createAttachment(
  itemId: string,
  file: { buffer: Buffer; mimeType: string },
) {
  const userId = await requireVaultAccess();

  const item = await findOwnedItem(itemId, userId);
  if (!item) throw new Error("Item tidak ditemukan.");

  const sealed = sealBytes(file.buffer);
  // Pathname acak, bukan diturunkan dari nama berkas — nama berkas asli
  // tidak pernah dikirim ke Blob sama sekali, hanya disimpan di dalam
  // aplikasi kalau suatu saat dibutuhkan (saat ini bahkan tidak disimpan;
  // lihat catatan di schema.prisma soal "nama berkas sering membocorkan isinya").
  const objectKey = await putAttachmentBytes(
    `legacy/${itemId}/${randomUUID()}`,
    Buffer.from(sealed.ciphertext),
  );

  // LegacyAttachment TIDAK punya kolom userId sendiri — kepemilikannya
  // menumpang relasi ke LegacyItem, dan findOwnedItem(itemId, userId) di
  // atas SUDAH membuktikannya sebelum baris ini sempat berjalan. Tidak ada
  // bentuk aman (lihat FORBIDDEN_OPS di src/lib/db.ts soal kenapa `update`
  // bersyarat dihindari di seluruh proyek ini) untuk menyuntikkan userId ke
  // dalam satu `create` tanpa kolom itu.
  return prisma.legacyAttachment.create({
    data: {
      itemId,
      objectKey,
      mimeType: file.mimeType,
      sizeBytes: file.buffer.byteLength,
      iv: sealed.iv,
      authTag: sealed.authTag,
      wrappedKey: sealed.wrappedKey,
      keyVersion: sealed.keyVersion,
    },
  });
}

/** `null` kalau lampiran tidak ada atau bukan milik user ini — dua kasus itu sengaja tidak dibedakan ke pemanggil. */
export async function getAttachmentFile(
  attachmentId: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const userId = await requireVaultAccess();

  const row = await prisma.legacyAttachment.findFirst({
    where: { id: attachmentId, item: { userId } },
  });
  if (!row) return null;

  const ciphertext = await getAttachmentBytes(row.objectKey);
  if (!ciphertext) return null;

  const bytes = openBytes({
    ciphertext,
    iv: row.iv,
    authTag: row.authTag,
    wrappedKey: row.wrappedKey,
  });

  return { bytes, mimeType: row.mimeType };
}

export async function deleteAttachment(attachmentId: string) {
  const userId = await requireVaultAccess();

  const row = await prisma.legacyAttachment.findFirst({
    where: { id: attachmentId, item: { userId } },
    select: { id: true, objectKey: true },
  });
  if (!row) return 0;

  await deleteAttachmentBytes(row.objectKey);
  // item.userId diulang di sini meski row.id sudah terbukti milik user ini
  // lewat findFirst di atas — supaya panggilan ini tetap membuktikan dirinya
  // sendiri walau suatu saat findFirst di atasnya dihapus atau diubah logiknya.
  const result = await prisma.legacyAttachment.deleteMany({
    where: { id: row.id, item: { userId } },
  });
  return result.count;
}
