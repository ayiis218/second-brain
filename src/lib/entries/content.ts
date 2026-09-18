/**
 * Pembaca `Entry.content` yang aman-tipe untuk sisi baca (UI, ringkasan).
 *
 * `content` adalah JSONB yang bentuknya berbeda per tipe entry — lihat
 * schemas.ts untuk validasi sisi tulis. Fungsi di sini murni ekstraksi,
 * tanpa validasi: dipakai di RSC dan client component yang hanya perlu
 * membaca satu-dua field tanpa peduli bentuk lengkapnya.
 *
 * Sebelumnya versi identik dari fungsi ini ditulis ulang di enam tempat
 * (today-summary, task/page, entry/[id]/page, entry-list, trash/page,
 * lib/insight) — konsolidasi di sini supaya perubahan bentuk `content`
 * cukup diperbaiki sekali.
 */

/** Ambil satu field dari `content` tanpa asumsi bentuknya. */
export function getContentField<T>(content: unknown, key: string): T | null {
  if (content && typeof content === "object" && key in content) {
    return (content as Record<string, T>)[key] ?? null;
  }
  return null;
}

/** `body` dijamin ada di setiap skema (lihat schemas.ts), tapi tetap dijaga di sini untuk `content` yang belum divalidasi. */
export function getEntryBody(content: unknown): string {
  const body = getContentField<string>(content, "body");
  return typeof body === "string" ? body : "";
}

/** Nilai mood mentah (1-5), bukan emoji — pemanggil yang butuh emoji mencocokkannya ke MOOD_OPTIONS sendiri. */
export function getEntryMood(content: unknown): number | null {
  const mood = getContentField<unknown>(content, "mood");
  return typeof mood === "number" ? mood : null;
}
