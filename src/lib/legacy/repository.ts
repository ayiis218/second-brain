import { isOwner, requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { open, seal } from "./crypto";
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
 * per-user — modul ini **khusus pemilik**. Setiap fungsi di sini memanggil
 * requireOwner() lebih dulu, dan userId tetap disertakan eksplisit di
 * setiap query.
 */

async function requireOwner(): Promise<string> {
  if (!(await isOwner())) {
    // Bukan 403 yang menjelaskan, melainkan penolakan datar. Keberadaan
    // modul ini pun tidak perlu dikonfirmasi ke pemanggil yang bukan pemilik.
    throw new Error("Tidak ditemukan.");
  }
  return requireUserId();
}

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
  const userId = await requireOwner();

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
  const userId = await requireOwner();

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
  const userId = await requireOwner();

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
  const userId = await requireOwner();
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
  const userId = await requireOwner();
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
  const userId = await requireOwner();
  // Hard delete, bukan soft: vault ini kecil dan isinya sensitif. Menyimpan
  // salinan terenkripsi dari sesuatu yang sengaja dihapus justru menambah
  // permukaan risiko tanpa manfaat.
  const result = await prisma.legacyItem.deleteMany({ where: { id, userId } });
  return result.count;
}

/** Berapa item yang belum punya langkah klaim padahal kategorinya menuntut. */
export async function countIncomplete() {
  const userId = await requireOwner();

  const rows = await prisma.legacyItem.findMany({
    where: { userId, category: { in: ["KEUANGAN", "INVESTASI", "ASET"] } },
  });

  return rows.filter((row) => isIncomplete(row.category, open<LegacyContent>(row))).length;
}
