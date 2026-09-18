import { scopedDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth-user";

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

/**
 * Mengganti seluruh tag sebuah entry dengan daftar baru.
 *
 * Internal folder repository — dipakai createEntry/updateEntry di entries.ts,
 * bukan bagian dari API publik modul ini.
 */
export async function setEntryTags(entryId: string, labels: string[]) {
  const db = await scopedDb();
  const tags = await upsertTags(labels);

  await db.entryTag.deleteMany({ where: { entryId } });
  if (tags.length === 0) return;

  await db.entryTag.createMany({
    data: tags.map((tag) => ({ entryId, tagId: tag.id })),
    skipDuplicates: true,
  });
}
