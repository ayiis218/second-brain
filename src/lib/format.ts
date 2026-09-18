/**
 * Formatter tampilan. Tidak ada yang boleh masuk jalur data dari sini —
 * nominal tetap `string`/`Decimal` sampai titik render (lihat catatan
 * `amount` di entries/schemas.ts).
 *
 * Sebelumnya `Intl.NumberFormat("id-ID", …)` yang sama ditulis ulang di empat
 * tempat (insight/page, finance-position, sync-button, entry-list) dengan
 * opsi yang harus dijaga tetap sama secara manual.
 */

/**
 * Dibuat sekali di module scope, bukan per pemanggilan.
 *
 * `Intl.NumberFormat` mahal untuk dikonstruksi, dan fungsi ini dipanggil
 * per baris di daftar entry dan tabel posisi finance — di sanalah biayanya
 * terasa, bukan di satu-dua pemanggilan.
 */
const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/**
 * Nominal rupiah. Menerima `string` karena itu bentuk aslinya di `content`
 * transaksi hasil sync — presisi `Decimal` tidak muat di float JS, jadi
 * konversi ke number hanya terjadi di sini.
 *
 * Nilai yang tidak bisa diangkakan dikembalikan apa adanya, bukan jadi "NaN"
 * di layar.
 */
export function formatIdr(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) return String(value);
  return IDR.format(numeric);
}
