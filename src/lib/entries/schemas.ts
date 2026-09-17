import { z } from "zod";

/**
 * Setiap skema WAJIB punya field `body` bertipe string.
 * Trigger `entry_before_write` membangun searchVector dari `content->>'body'`;
 * tipe entry tanpa `body` tidak akan pernah bisa dicari.
 */

export const journalContent = z.object({
  // Boleh kosong: aturan "judul atau isi minimal salah satu" ditegakkan di
  // boundary action, bukan di sini. Untuk task dan habit, judul justru field
  // yang alami — memaksa isi bikin orang mengarang teks supaya tombol jalan.
  body: z.string().default(""),
  mood: z.number().int().min(1).max(5).optional(),
});

export const taskContent = z.object({
  body: z.string().default(""),
  status: z.enum(["todo", "doing", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueAt: z.iso.datetime().nullable().default(null),
});

export const noteContent = z.object({
  body: z.string().default(""),
});

/** Definisi kebiasaan. Namanya ada di `title` entry, bukan di content. */
export const habitContent = z.object({
  body: z.string().default(""),
});

/**
 * Satu centang kebiasaan pada satu hari.
 *
 * `dayKey` disimpan eksplisit, bukan diturunkan dari `occurredAt` saat query.
 * Dua alasan: batas hari WIB tetap dihitung di satu tempat (lib/time.ts),
 * dan kolomnya bisa dipakai unique index parsial untuk mencegah satu
 * kebiasaan tercentang dua kali di hari yang sama.
 */
export const habitLogContent = z.object({
  body: z.string().default(""),
  habitId: z.string().min(1),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  habit: habitContent,
  habit_log: habitLogContent,
  transaction: transactionContent,
} as const;

export type EntryType = keyof typeof entryContentSchemas;
export type EntryContent<T extends EntryType> = z.infer<(typeof entryContentSchemas)[T]>;

export const ENTRY_TYPES = Object.keys(entryContentSchemas) as [EntryType, ...EntryType[]];

/**
 * Tipe yang tidak boleh lahir dari form quick capture.
 *
 * `transaction` hanya lahir dari sync — tanpa pemisahan ini siapa pun bisa
 * mengirim `type=transaction` dan menciptakan transaksi palsu yang tampak
 * seperti hasil sync.
 *
 * `habit_log` hanya lahir dari aksi centang, yang menghitung `dayKey`-nya
 * sendiri; membiarkannya lewat form berarti dayKey bisa dikarang.
 */
const SYSTEM_ONLY_TYPES: ReadonlySet<string> = new Set(["transaction", "habit_log"]);

/** Seluruh tipe — termasuk yang hanya lahir dari sync. */
export const entryTypeSchema = z.enum(ENTRY_TYPES);

/** Tipe yang boleh dibuat/diubah user lewat form. Dipakai di boundary action. */
export const userCreatableTypeSchema = z.enum(
  ENTRY_TYPES.filter((t) => !SYSTEM_ONLY_TYPES.has(t)) as [EntryType, ...EntryType[]],
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
