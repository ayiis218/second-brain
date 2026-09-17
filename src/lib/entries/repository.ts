import type { Prisma } from "@prisma/client";
import { scopedDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { parseEntryContent, type EntryType } from "./schemas";

/**
 * Satu-satunya modul yang boleh menyentuh Prisma untuk Entry, Tag, dan
 * EntryLink. Dua aturan yang ditegakkan di sini:
 *
 * 1. Semua tulis ke Entry.content melewati parseEntryContent().
 * 2. Semua query terikat user dari sesi — fungsi di bawah tidak menerima
 *    userId sebagai parameter, jadi pemanggil tidak bisa lupa mengirimnya.
 *
 * Keduanya diperiksa `npm run check:gates`.
 */

const WITH_TAGS = { tags: { include: { tag: true } } } as const;

// --- Tag --------------------------------------------------------------------

/** Nama tag dinormalisasi di server, bukan di klien. */
function normalizeTagName(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseTagList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(",")) {
    const label = piece.trim();
    if (!label) continue;
    const name = normalizeTagName(label);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(label);
  }
  return out;
}

export async function listTags() {
  const db = await scopedDb();
  return db.tag.findMany({ orderBy: { label: "asc" } });
}

export async function listTagsWithCount() {
  const db = await scopedDb();
  const tags = await db.tag.findMany({
    orderBy: { label: "asc" },
    include: { _count: { select: { entries: true } } },
  });

  return tags.map((tag) => ({ id: tag.id, label: tag.label, count: tag._count.entries }));
}

/**
 * Membuat tag yang belum ada lalu mengembalikan seluruh id-nya.
 *
 * Tidak memakai `upsert` — operasi itu dilarang extension karena `where`-nya
 * hanya menerima field unik sehingga penyuntikan userId jadi halus. Alurnya
 * dibuat lugas: cari dulu, buat yang kurang.
 */
export async function upsertTags(labels: string[]) {
  if (labels.length === 0) return [];

  const userId = await requireUserId();
  const db = await scopedDb();

  const names = labels.map(normalizeTagName);
  const existing = await db.tag.findMany({ where: { name: { in: names } } });
  const byName = new Map(existing.map((tag) => [tag.name, tag]));

  const missing = labels.filter((label) => !byName.has(normalizeTagName(label)));

  for (const label of missing) {
    const name = normalizeTagName(label);
    try {
      const created = await db.tag.create({ data: { userId, name, label } });
      byName.set(name, created);
    } catch {
      // Balapan dengan permintaan lain yang membuat tag sama: constraint
      // unik (userId, name) yang menang, dan kita cukup membaca ulang.
      const found = await db.tag.findFirst({ where: { name } });
      if (found) byName.set(name, found);
    }
  }

  return names.map((name) => byName.get(name)).filter((tag) => tag !== undefined);
}

export async function renameTag(id: string, label: string) {
  const db = await scopedDb();
  return db.tag.updateMany({
    where: { id },
    data: { label, name: normalizeTagName(label) },
  });
}

export async function deleteTag(id: string) {
  const db = await scopedDb();
  return db.tag.deleteMany({ where: { id } });
}

/** Mengganti seluruh tag sebuah entry dengan daftar baru. */
async function setEntryTags(entryId: string, labels: string[]) {
  const db = await scopedDb();
  const tags = await upsertTags(labels);

  await db.entryTag.deleteMany({ where: { entryId } });
  if (tags.length === 0) return;

  await db.entryTag.createMany({
    data: tags.map((tag) => ({ entryId, tagId: tag.id })),
    skipDuplicates: true,
  });
}

// --- Entry ------------------------------------------------------------------

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

/** Cursor keyset `"<ISO occurredAt>|<id>"` — pola yang sama dengan sync finance. */
export function encodeEntryCursor(entry: { occurredAt: Date; id: string }) {
  return `${entry.occurredAt.toISOString()}|${entry.id}`;
}

function decodeEntryCursor(cursor: string | undefined) {
  if (!cursor) return null;
  const i = cursor.lastIndexOf("|");
  if (i < 1) return null;
  const at = new Date(cursor.slice(0, i));
  const id = cursor.slice(i + 1);
  return Number.isNaN(at.getTime()) || !id ? null : { at, id };
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

// --- Tempat sampah ----------------------------------------------------------

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

// --- Tautan antar-entry -----------------------------------------------------

/**
 * Tautan bersifat dua arah untuk pembacaan: entry A yang ditautkan ke B harus
 * terlihat dari B juga. Barisnya tetap satu — arah disimpan, tapi tidak
 * dipakai untuk menyembunyikan.
 */
export async function listLinks(entryId: string) {
  const db = await scopedDb();

  const links = await db.entryLink.findMany({
    where: { OR: [{ fromId: entryId }, { toId: entryId }] },
    include: {
      from: { select: { id: true, type: true, title: true, occurredAt: true } },
      to: { select: { id: true, type: true, title: true, occurredAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return links.map((link) => ({
    linkId: link.id,
    other: link.fromId === entryId ? link.to : link.from,
  }));
}

export async function createLink(fromId: string, toId: string) {
  if (fromId === toId) throw new Error("Entry tidak bisa ditautkan ke dirinya sendiri.");

  const userId = await requireUserId();
  const db = await scopedDb();

  // Kedua ujung diperiksa lewat query ber-scope: entry milik user lain
  // tidak akan ditemukan, jadi tautan lintas-akun mustahil terbentuk.
  const ends = await db.entry.findMany({
    where: { id: { in: [fromId, toId] }, deletedAt: null },
    select: { id: true },
  });
  if (ends.length !== 2) throw new Error("Entry tidak ditemukan.");

  const existing = await db.entryLink.findFirst({
    where: {
      OR: [
        { fromId, toId },
        { fromId: toId, toId: fromId },
      ],
    },
  });
  if (existing) return existing;

  return db.entryLink.create({ data: { userId, fromId, toId } });
}

export async function deleteLink(linkId: string) {
  const db = await scopedDb();
  const result = await db.entryLink.deleteMany({ where: { id: linkId } });
  return result.count;
}

// --- Task -------------------------------------------------------------------

/**
 * Task disimpan di `content` JSONB, bukan tabel terpisah — lihat
 * rencana-fase-2-second-brain.md §3. Query-nya ditopang expression index
 * parsial pada (content->>'status') dan (content->>'dueAt').
 */
export async function listTasks(opts?: { includeDone?: boolean }) {
  const db = await scopedDb();

  const entries = await db.entry.findMany({
    where: {
      type: "task",
      deletedAt: null,
      ...(opts?.includeDone
        ? {}
        : { NOT: { content: { path: ["status"], equals: "done" } } }),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: 500,
    include: WITH_TAGS,
  });

  return entries;
}

export async function setTaskStatus(id: string, status: string) {
  const db = await scopedDb();

  const entry = await db.entry.findFirst({ where: { id, type: "task", deletedAt: null } });
  if (!entry) return 0;

  const content = parseEntryContent("task", {
    ...(entry.content as Record<string, unknown>),
    status,
  });

  const result = await db.entry.updateMany({
    where: { id },
    data: { content: content as Prisma.InputJsonValue },
  });

  return result.count;
}

// --- Habit ------------------------------------------------------------------

export type HabitSummary = {
  id: string;
  name: string;
  doneToday: boolean;
  streak: number;
  recentDays: { dayKey: string; done: boolean }[];
};

/**
 * Streak = jumlah hari berurutan sampai hari ini.
 *
 * Hari ini yang belum dicentang TIDAK memutus streak — kalau begitu, streak
 * akan terlihat nol setiap pagi sebelum kebiasaannya dikerjakan. Hitungannya
 * dimulai dari hari ini kalau sudah dicentang, kalau belum dari kemarin.
 */
function computeStreak(done: ReadonlySet<string>, todayKey: string): number {
  const cursor = new Date(`${todayKey}T00:00:00Z`);
  if (!done.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!done.has(key)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function listHabits(opts: {
  todayKey: string;
  recentKeys: string[];
}): Promise<HabitSummary[]> {
  const db = await scopedDb();

  const [habits, logs] = await Promise.all([
    db.entry.findMany({
      where: { type: "habit", deletedAt: null },
      orderBy: [{ occurredAt: "asc" }],
    }),
    db.entry.findMany({
      where: { type: "habit_log", deletedAt: null },
      select: { content: true },
    }),
  ]);

  const doneByHabit = new Map<string, Set<string>>();
  for (const log of logs) {
    const content = log.content as { habitId?: string; dayKey?: string } | null;
    if (!content?.habitId || !content.dayKey) continue;
    const set = doneByHabit.get(content.habitId) ?? new Set<string>();
    set.add(content.dayKey);
    doneByHabit.set(content.habitId, set);
  }

  return habits.map((habit) => {
    const done = doneByHabit.get(habit.id) ?? new Set<string>();
    return {
      id: habit.id,
      name: habit.title || "(tanpa nama)",
      doneToday: done.has(opts.todayKey),
      streak: computeStreak(done, opts.todayKey),
      recentDays: opts.recentKeys.map((dayKey) => ({ dayKey, done: done.has(dayKey) })),
    };
  });
}

/**
 * Mencentang atau membatalkan centang satu kebiasaan pada satu hari.
 *
 * Membatalkan memakai hard delete, bukan soft delete: baris yang di-soft-delete
 * tetap menempati unique index parsial hanya kalau ikut terhitung — dan karena
 * index-nya mengecualikan `deletedAt IS NOT NULL`, soft delete akan
 * meninggalkan riwayat centang yang tidak berarti apa-apa. Centang habit
 * adalah fakta biner per hari, bukan catatan yang perlu diarsipkan.
 */
export async function toggleHabitDay(habitId: string, dayKey: string) {
  const userId = await requireUserId();
  const db = await scopedDb();

  const habit = await db.entry.findFirst({
    where: { id: habitId, type: "habit", deletedAt: null },
    select: { id: true },
  });
  if (!habit) throw new Error("Habit tidak ditemukan.");

  // Filter JSON path, bukan memuat seluruh habit_log lalu menyaring di
  // memori. Lima kebiasaan selama setahun ≈ 1.800 baris, dan versi lama
  // menariknya semua setiap kali satu kotak dicentang.
  const match = await db.entry.findFirst({
    where: {
      type: "habit_log",
      deletedAt: null,
      AND: [
        { content: { path: ["habitId"], equals: habitId } },
        { content: { path: ["dayKey"], equals: dayKey } },
      ],
    },
    select: { id: true },
  });

  if (match) {
    await db.entry.deleteMany({ where: { id: match.id } });
    return { done: false };
  }

  const content = parseEntryContent("habit_log", { body: "", habitId, dayKey });
  await db.entry.create({
    data: {
      userId,
      type: "habit_log",
      title: null,
      content: content as Prisma.InputJsonValue,
      occurredAt: new Date(`${dayKey}T12:00:00Z`),
    },
  });
  return { done: true };
}

// --- Search -----------------------------------------------------------------

export type SearchHit = {
  id: string;
  type: string;
  title: string | null;
  occurredAt: Date;
  headline: string;
  rank: number;
};

/**
 * Full-text search di atas kolom `searchVector` yang dipelihara trigger.
 *
 * INI SATU-SATUNYA QUERY YANG TIDAK DILINDUNGI Prisma Client Extension:
 * SQL mentah tidak tersentuh penyuntik userId di src/lib/db.ts. Filter
 * "userId" = ${userId} di bawah adalah pertahanan tunggalnya — jangan
 * dihapus, dan jangan menambah query raw lain tanpa filter serupa.
 * `npm run check:gates` memeriksa keberadaannya.
 */
export async function searchEntries(query: string, opts?: { type?: string; limit?: number }) {
  const userId = await requireUserId();
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Pencarian sambil mengetik butuh kata terakhir diperlakukan sebagai
  // awalan — tanpa itu "kambi" tidak akan pernah menemukan "kambing".
  //
  // JANGAN meng-OR awalan itu dengan query utama. Versi lama melakukannya
  // dan hasilnya `('zzzz' & 'makan') | 'makan:*'` — cabang kanan cocok
  // sendirian, sehingga semua kata kecuali yang terakhir diabaikan. Mencari
  // "zzzz makan" mengembalikan 51 baris padahal seharusnya nol.
  //
  // Jadi tsquery-nya dirakit utuh: kata-kata awal di-AND biasa, hanya kata
  // terakhir yang dapat ':*'.
  const terms = trimmed.split(/\s+/).filter(Boolean);
  const plain = terms.length > 0 && terms.every((t) => /^[\p{L}\p{N}]+$/u.test(t));
  // Query dengan kutip atau operator (-kata, OR) diserahkan sepenuhnya ke
  // websearch_to_tsquery, dan fitur awalan dilepas. Mencampur keduanya
  // persis yang melahirkan bug di atas.
  const prefixQuery = plain
    ? terms.map((t, i) => (i === terms.length - 1 ? `${t}:*` : t)).join(" & ")
    : null;

  const typeFilter = opts?.type ?? null;
  const limit = opts?.limit ?? 50;

  const rows = await prisma.$queryRaw<SearchHit[]>`
    WITH q AS (
      SELECT CASE
               WHEN ${prefixQuery}::text IS NULL
                 THEN websearch_to_tsquery('simple', ${trimmed})
               ELSE to_tsquery('simple', ${prefixQuery}::text)
             END AS tsq
    )
    SELECT e."id",
           e."type",
           e."title",
           e."occurredAt",
           ts_headline(
             'simple',
             coalesce(e."title", '') || ' — ' || coalesce(e."content"->>'body', ''),
             q.tsq,
             'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=24, MinWords=8'
           ) AS headline,
           ts_rank(e."searchVector", q.tsq) AS rank
      FROM "Entry" e, q
     WHERE e."userId" = ${userId}
       AND e."deletedAt" IS NULL
       AND (${typeFilter}::text IS NULL OR e."type" = ${typeFilter}::text)
       AND e."searchVector" @@ q.tsq
     ORDER BY rank DESC, e."occurredAt" DESC
     LIMIT ${limit}
  `;

  return rows;
}

// --- Akun -------------------------------------------------------------------

/**
 * Menghapus akun beserta SELURUH datanya.
 *
 * Memakai `prisma` mentah, bukan scopedDb: menghapus baris User berada di
 * luar model ber-scope, dan penghapusan datanya terjadi lewat
 * `onDelete: Cascade` di level database. userId tetap diambil dari sesi,
 * jadi user hanya bisa menghapus dirinya sendiri.
 */
export async function deleteOwnAccount() {
  const userId = await requireUserId();
  await prisma.user.delete({ where: { id: userId } });
}

/** Seluruh data user untuk keperluan export (§11.3 rencana induk). */
export async function exportAll() {
  const db = await scopedDb();

  const [entries, tags, links] = await Promise.all([
    db.entry.findMany({
      where: { deletedAt: null },
      orderBy: [{ occurredAt: "asc" }],
      include: WITH_TAGS,
    }),
    db.tag.findMany({ orderBy: { label: "asc" } }),
    db.entryLink.findMany(),
  ]);

  return { entries, tags, links };
}

export type EntryWithTags = Awaited<ReturnType<typeof listEntries>>["entries"][number];
