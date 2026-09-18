/**
 * Potongan internal yang dipakai beberapa modul repository sekaligus.
 *
 * Tidak diekspor lewat index.ts kecuali `encodeEntryCursor` — sisanya detail
 * yang tidak boleh bocor keluar folder ini.
 */

export const WITH_TAGS = { tags: { include: { tag: true } } } as const;

/** Cursor keyset `"<ISO occurredAt>|<id>"` — pola yang sama dengan sync finance. */
export function encodeEntryCursor(entry: { occurredAt: Date; id: string }) {
  return `${entry.occurredAt.toISOString()}|${entry.id}`;
}

export function decodeEntryCursor(cursor: string | undefined) {
  if (!cursor) return null;
  const i = cursor.lastIndexOf("|");
  if (i < 1) return null;
  const at = new Date(cursor.slice(0, i));
  const id = cursor.slice(i + 1);
  return Number.isNaN(at.getTime()) || !id ? null : { at, id };
}
