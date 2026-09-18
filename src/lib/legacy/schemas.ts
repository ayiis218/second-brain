import { z } from "zod";

/**
 * Isi item Legacy — divalidasi sebelum dienkripsi, pola yang sama dengan
 * Entry.content. Seluruh field di sini berakhir di dalam ciphertext.
 */

export const LEGACY_CATEGORIES = [
  "KEUANGAN",
  "INVESTASI",
  "ASET",
  "DOKUMEN",
  "AKSES_DIGITAL",
  "UTANG_PIUTANG",
  "KONTAK",
  "INSTRUKSI",
] as const;

export type LegacyCategoryValue = (typeof LEGACY_CATEGORIES)[number];

export const legacyCategorySchema = z.enum(LEGACY_CATEGORIES);

/**
 * Tetap Bahasa Indonesia — lihat alasannya di components/legacy/legacy-form.tsx:
 * kategori ini dibaca ahli waris, bukan pemilik aplikasi.
 */
export const CATEGORY_LABEL: Record<LegacyCategoryValue, string> = {
  KEUANGAN: "Rekening & dompet",
  INVESTASI: "Investasi",
  ASET: "Aset",
  DOKUMEN: "Dokumen penting",
  AKSES_DIGITAL: "Akun & aplikasi",
  UTANG_PIUTANG: "Utang & piutang",
  KONTAK: "Kontak penting",
  INSTRUKSI: "Pesan & instruksi",
};

/**
 * Kategori yang klaimnya tidak otomatis jelas bagi ahli waris. Untuk ini,
 * `claimSteps` wajib — item yang tidak bisa diklaim sama saja dengan tidak
 * dicatat. Lihat rencana-fase-5-legacy.md §4.3.
 */
export const CLAIM_REQUIRED: ReadonlySet<string> = new Set([
  "KEUANGAN",
  "INVESTASI",
  "ASET",
]);

export const legacyContentSchema = z.object({
  title: z.string().trim().min(1, "judul harus diisi"),
  detail: z.string().trim().default(""),
  /// Lembaga penerbit atau pengelola — BRI, Bibit, BPJS Ketenagakerjaan.
  institution: z.string().trim().default(""),
  /// Nomor rekening, sertifikat, atau polis.
  identifier: z.string().trim().default(""),
  /// Di mana barang atau dokumennya secara fisik.
  location: z.string().trim().default(""),
  /// Cara masuk — BUKAN password mentah (rencana induk §7.2).
  accessNote: z.string().trim().default(""),
  /// Langkah klaim untuk ahli waris.
  claimSteps: z.string().trim().default(""),
  contactName: z.string().trim().default(""),
  contactPhone: z.string().trim().default(""),
});

export type LegacyContent = z.infer<typeof legacyContentSchema>;

export function parseLegacyContent(value: unknown): LegacyContent {
  return legacyContentSchema.parse(value);
}

/** Item dianggap belum lengkap kalau kategorinya menuntut claimSteps. */
export function isIncomplete(category: string, content: LegacyContent): boolean {
  return CLAIM_REQUIRED.has(category) && content.claimSteps.length === 0;
}

/**
 * Petunjuk tetap di form, bukan kolom kosong. Tanpa pertanyaan pemandu,
 * yang tertulis biasanya "hubungi bank" — dan itu tidak menolong siapa pun.
 */
export const CLAIM_HINT =
  "Ke lembaga mana? Bawa dokumen apa? Ada tenggat waktu? Siapa yang bisa dihubungi kalau bingung?";
