/**
 * Logic murni perakitan tsquery — sengaja TANPA impor Next.js/Prisma/
 * next-auth. `search.ts` tetap pemilik query database; berkas ini cuma
 * teks. Lihat habit-streak.ts untuk alasan pemisahan yang sama (rantai
 * impor next-auth gagal di-resolve Vitest).
 *
 * Merakit tsquery mode-awalan dari kata-kata yang sudah di-trim, atau
 * `null` kalau query-nya harus diserahkan mentah ke `websearch_to_tsquery`.
 *
 * Pencarian sambil mengetik butuh kata terakhir diperlakukan sebagai
 * awalan — tanpa itu "kambi" tidak akan pernah menemukan "kambing".
 *
 * JANGAN meng-OR awalan itu dengan query utama. Versi lama melakukannya
 * dan hasilnya `('zzzz' & 'makan') | 'makan:*'` — cabang kanan cocok
 * sendirian, sehingga semua kata kecuali yang terakhir diabaikan. Mencari
 * "zzzz makan" mengembalikan 51 baris padahal seharusnya nol.
 *
 * Jadi tsquery-nya dirakit utuh: kata-kata awal di-AND biasa, hanya kata
 * terakhir yang dapat ':*'. Query dengan kutip atau operator (-kata, OR)
 * diserahkan sepenuhnya ke websearch_to_tsquery, dan fitur awalan dilepas
 * (`null`) — mencampur keduanya persis yang melahirkan bug di atas.
 */
export function buildPrefixQuery(trimmed: string): string | null {
  const terms = trimmed.split(/\s+/).filter(Boolean);
  const plain = terms.length > 0 && terms.every((t) => /^[\p{L}\p{N}]+$/u.test(t));
  return plain
    ? terms.map((t, i) => (i === terms.length - 1 ? `${t}:*` : t)).join(" & ")
    : null;
}
