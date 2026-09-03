import { z } from "zod";

/**
 * Setiap skema WAJIB punya field `body` bertipe string.
 * Trigger `entry_before_write` membangun searchVector dari `content->>'body'`;
 * tipe entry tanpa `body` tidak akan pernah bisa dicari.
 */

export const journalContent = z.object({
  body: z.string().min(1),
  mood: z.number().int().min(1).max(5).optional(),
});

export const taskContent = z.object({
  body: z.string().default(""),
  status: z.enum(["todo", "doing", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueAt: z.iso.datetime().nullable().default(null),
});

export const noteContent = z.object({
  body: z.string().min(1),
});

export const entryContentSchemas = {
  journal: journalContent,
  task: taskContent,
  note: noteContent,
} as const;

export type EntryType = keyof typeof entryContentSchemas;
export type EntryContent<T extends EntryType> = z.infer<(typeof entryContentSchemas)[T]>;

export const ENTRY_TYPES = Object.keys(entryContentSchemas) as [EntryType, ...EntryType[]];

/** Skema Zod untuk `type` itu sendiri — dipakai di boundary form/API. */
export const entryTypeSchema = z.enum(ENTRY_TYPES);

export function isEntryType(v: unknown): v is EntryType {
  return typeof v === "string" && v in entryContentSchemas;
}

/**
 * SATU-SATUNYA jalan menulis Entry.content.
 *
 * Tidak boleh ada prisma.entry.create/update dengan content mentah di mana pun
 * selain src/lib/entries/repository.ts. Ini yang menjaga kolom JSONB tidak
 * berubah jadi tempat sampah. Diverifikasi dengan `npm run check:gates`.
 */
export function parseEntryContent<T extends EntryType>(
  type: T,
  content: unknown,
): EntryContent<T> {
  // Dilebarkan ke ZodType supaya `.parse` tidak jadi union-of-signatures
  // yang tidak bisa dipanggil ketika T masih berupa union.
  const schema: z.ZodType = entryContentSchemas[type];
  return schema.parse(content) as EntryContent<T>;
}
