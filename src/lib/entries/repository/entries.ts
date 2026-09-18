import type { Prisma } from "@prisma/client";

import { scopedDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth-user";
import { parseEntryContent, type EntryType } from "../schemas";
import { decodeEntryCursor, encodeEntryCursor, WITH_TAGS } from "./shared";
import { setEntryTags } from "./tags";

export async function createEntry<T extends EntryType>(input: {
  type: T;
  title?: string | null;
  content: unknown;
  occurredAt?: Date;
  tags?: string[];
}) {
  const userId = await requireUserId();
  const db = await scopedDb();
  const content = parseEntryContent(input.type, input.content);

  // userId ditulis eksplisit meski extension juga menyuntikkannya. Nilainya
  // sama, tapi kolom penentu isolasi tidak seharusnya bergantung pada type
  // assertion yang bisa "dirapikan" orang lain suatu saat.
  const entry = await db.entry.create({
    data: {
      userId,
      type: input.type,
      title: input.title ?? null,
      content: content as Prisma.InputJsonValue,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });

  if (input.tags?.length) await setEntryTags(entry.id, input.tags);
  return entry;
}

export async function updateEntry<T extends EntryType>(input: {
  id: string;
  type: T;
  title?: string | null;
  content: unknown;
  tags?: string[];
}) {
  const db = await scopedDb();
  const parsed = parseEntryContent(input.type, input.content);

  // updateMany, bukan update: filter userId disuntikkan ke `where` dan
  // baris milik user lain tidak akan pernah tersentuh.
  const result = await db.entry.updateMany({
    where: { id: input.id, source: "NATIVE" },
    data: {
      title: input.title ?? null,
      content: parsed as Prisma.InputJsonValue,
    },
  });

  if (result.count === 0) return 0;
  await setEntryTags(input.id, input.tags ?? []);
  return result.count;
}

export async function listEntries(opts?: {
  type?: EntryType;
  limit?: number;
  tagId?: string;
  cursor?: string;
  /**
   * Hanya entry yang ditulis sendiri, tanpa hasil sync.
   *
   * Beranda memakainya. Data sync tumbuh jauh lebih cepat daripada catatan
   * buatan tangan — sekali sync bisa membawa ratusan baris sekaligus — jadi
   * daftar campuran akan SELALU didominasi hasil sync, berapa pun batasnya
   * dinaikkan. Transaksinya tetap ada di /finance, timeline, dan search.
   */
  nativeOnly?: boolean;
}) {
  const db = await scopedDb();
  const limit = opts?.limit ?? 50;
  const cursor = decodeEntryCursor(opts?.cursor);

  // Keyset, bukan offset: offset melewatkan atau menggandakan baris kalau ada
  // entry baru ditulis di tengah penelusuran — dan di aplikasi ini menulis
  // entry baru justru hal yang paling sering terjadi.
  const rows = await db.entry.findMany({
    where: {
      deletedAt: null,
      // habit_log tidak punya isi untuk dibaca — menampilkannya di timeline
      // hanya membanjiri linimasa dengan baris kosong.
      ...(opts?.type ? { type: opts.type } : { NOT: { type: "habit_log" } }),
      ...(opts?.nativeOnly ? { source: "NATIVE" } : {}),
      ...(opts?.tagId ? { tags: { some: { tagId: opts.tagId } } } : {}),
      ...(cursor
        ? {
            OR: [
              { occurredAt: { lt: cursor.at } },
              { occurredAt: cursor.at, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    // +1 untuk mendeteksi masih ada halaman lagi tanpa query count terpisah.
    take: limit + 1,
    include: WITH_TAGS,
  });

  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;
  const last = entries.at(-1);

  return {
    entries,
    hasMore,
    nextCursor: hasMore && last ? encodeEntryCursor(last) : null,
  };
}

/**
 * Hitungan sungguhan, bukan panjang halaman yang sedang tampil. Menampilkan
 * "20+" karena halamannya berpaginasi adalah angka yang menyesatkan, dan itu
 * lebih buruk daripada tidak ada angka.
 */
export async function countEntries(opts?: { type?: EntryType }) {
  const db = await scopedDb();
  return db.entry.count({
    where: {
      deletedAt: null,
      ...(opts?.type ? { type: opts.type } : { NOT: { type: "habit_log" } }),
    },
  });
}

export async function getEntry(id: string) {
  const db = await scopedDb();

  return db.entry.findFirst({
    where: { id, deletedAt: null },
    include: WITH_TAGS,
  });
}

export async function softDeleteEntry(id: string) {
  const db = await scopedDb();

  const target = await db.entry.findFirst({ where: { id }, select: { type: true } });

  const result = await db.entry.updateMany({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Centang habit menunjuk habitId lewat JSONB, bukan foreign key, jadi tidak
  // ada cascade yang membersihkannya. Tanpa langkah ini log-nya menumpuk
  // selamanya: tak terlihat di mana pun, tapi ikut terbawa setiap export.
  if (result.count > 0 && target?.type === "habit") {
    await db.entry.deleteMany({
      where: { type: "habit_log", content: { path: ["habitId"], equals: id } },
    });
  }

  return result.count;
}

export type EntryWithTags = Awaited<ReturnType<typeof listEntries>>["entries"][number];
