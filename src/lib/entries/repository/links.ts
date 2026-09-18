import { scopedDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth-user";

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
