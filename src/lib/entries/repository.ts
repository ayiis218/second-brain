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

export async function listEntries(opts?: {
  type?: EntryType;
  limit?: number;
  tagId?: string;
}) {
  const db = await scopedDb();

  return db.entry.findMany({
    where: {
      deletedAt: null,
      ...(opts?.type ? { type: opts.type } : {}),
      ...(opts?.tagId ? { tags: { some: { tagId: opts.tagId } } } : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: opts?.limit ?? 50,
    include: WITH_TAGS,
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

  const result = await db.entry.updateMany({
    where: { id },
    data: { deletedAt: new Date() },
  });

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

  // websearch_to_tsquery memahami frasa berkutip dan operator (-kata).
  // Kata terakhir ditambah ':*' lewat to_tsquery terpisah supaya pencarian
  // sambil mengetik menemukan kata yang belum selesai — tanpa itu "kambi"
  // tidak akan pernah menemukan "kambing".
  const prefixTerm = trimmed.split(/\s+/).pop() ?? "";
  // Dihitung di luar query: template literal bersarang di dalam $queryRaw
  // membuat SQL-nya sulit dibaca sekaligus memutus pemindaian check-gates.
  const prefixQuery = /^[\p{L}\p{N}]+$/u.test(prefixTerm) ? `${prefixTerm}:*` : null;
  const typeFilter = opts?.type ?? null;
  const limit = opts?.limit ?? 50;

  const rows = await prisma.$queryRaw<SearchHit[]>`
    WITH q AS (
      SELECT CASE
               WHEN ${prefixQuery}::text IS NULL
                 THEN websearch_to_tsquery('simple', ${trimmed})
               ELSE websearch_to_tsquery('simple', ${trimmed})
                    || to_tsquery('simple', ${prefixQuery}::text)
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

export type EntryWithTags = Awaited<ReturnType<typeof listEntries>>[number];
