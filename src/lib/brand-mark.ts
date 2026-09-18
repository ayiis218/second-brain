/**
 * Lambang aplikasi: satu belahan otak yang bercabang jadi simpul-simpul.
 *
 * Maknanya langsung ke fungsi aplikasi — ingatan yang ditumpahkan lalu
 * bertaut (journal, task, habit, note, timeline), bukan sekadar inisial "SB"
 * yang tidak memberi tahu apa pun tentang isinya.
 *
 * Disimpan sebagai string SVG, bukan berkas PNG: satu sumber kebenaran yang
 * dipakai ulang oleh `icon`, `apple-icon`, dan ikon maskable, dan tidak ada
 * aset biner di repo.
 */

/** Gradasi brand ColorHunt, sama dengan `.bg-brand-gradient` di globals.css. */
export const BRAND_GRADIENT = "linear-gradient(135deg, #3368A0, #66A3BF 55%, #C8DFDB)";

/** Latar ikon maskable harus solid: Android memotongnya jadi lingkaran/squircle. */
export const BRAND_INK = "#FFFFFF";

/**
 * Isi lambang di dalam kotak 100×100. Bidang gambarnya sendiri 71×68 dan sudah
 * dipusatkan (`translate(1 4)`), jadi penskalaan cukup lewat lebar <img>.
 */
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="translate(1 4)"><g fill="none" stroke="${BRAND_INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M50 20C41 13 27 16 24 27 15 31 13 43 20 49 14 57 18 69 28 71 32 80 44 83 50 76"/><path d="M50 20v56"/><path d="M50 33h15"/><path d="M50 52h22"/><path d="M50 68h15"/></g><g fill="${BRAND_INK}"><circle cx="71" cy="33" r="7"/><circle cx="78" cy="52" r="7"/><circle cx="71" cy="68" r="7"/></g></g></svg>`;

/**
 * Data URI untuk dipakai sebagai `src` <img> di dalam `ImageResponse`.
 *
 * `encodeURIComponent`, bukan base64: tidak butuh `Buffer`, jadi aman di
 * runtime mana pun ikon ini digenerate.
 */
export const BRAND_MARK_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(MARK_SVG)}`;

/** Proporsi bidang gambar terhadap kotak 100×100 — dipakai menghitung skala. */
const MARK_CONTENT_RATIO = 0.71;

/**
 * Lebar <img> agar gambarnya menempati `share` bagian dari sisi ikon.
 *
 * Ikon maskable memakai `share` yang lebih kecil: Android hanya menjamin 80%
 * bagian tengah ikut terlihat, sisanya boleh terpotong.
 */
export function markWidth(canvas: number, share: number) {
  return Math.round((canvas * share) / MARK_CONTENT_RATIO);
}
