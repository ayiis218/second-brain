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

/**
 * Transaksi hasil sync dari finance-dashboard (Fase 3).
 *
 * `amount` bertipe string, bukan number: nilainya `Decimal` di sumbernya dan
 * presisi penuhnya tidak muat di float JS. Jangan pernah mengubahnya jadi
 * number di jalur data — hanya saat memformat untuk tampilan.
 *
 * Tipe ini TIDAK muncul di pemilih quick capture: entry-nya hanya lahir dari
 * sync, dan read-only di aplikasi ini.
 */
export const transactionContent = z.object({
  body: z.string(),
  txType: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  category: z.string(),
  amount: z.string(),
  accountName: z.string(),
  toAccountName: z.string().nullable().default(null),
  affectsBalance: z.boolean().default(true),
});

export const entryContentSchemas = {
  journal: journalContent,
  task: taskContent,
  note: noteContent,
  transaction: transactionContent,
} as const;

export type EntryType = keyof typeof entryContentSchemas;
export type EntryContent<T extends EntryType> = z.infer<(typeof entryContentSchemas)[T]>;

export const ENTRY_TYPES = Object.keys(entryContentSchemas) as [EntryType, ...EntryType[]];

/**
 * Tipe yang hanya boleh lahir dari sync, tidak pernah dari form.
 * Tanpa pemisahan ini, siapa pun bisa mengirim `type=transaction` ke server
 * action dan menciptakan transaksi palsu yang tampak seperti hasil sync.
 */
const SYNC_ONLY_TYPES: ReadonlySet<string> = new Set(["transaction"]);

/** Seluruh tipe — termasuk yang hanya lahir dari sync. */
export const entryTypeSchema = z.enum(ENTRY_TYPES);

/** Tipe yang boleh dibuat/diubah user lewat form. Dipakai di boundary action. */
export const userCreatableTypeSchema = z.enum(
  ENTRY_TYPES.filter((t) => !SYNC_ONLY_TYPES.has(t)) as [EntryType, ...EntryType[]],
);

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
