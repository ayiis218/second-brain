import { scopedDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { WITH_TAGS } from "./shared";

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
