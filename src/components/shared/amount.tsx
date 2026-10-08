"use client";

import { useBalanceVisibility } from "@/components/shared/balance-visibility";

/**
 * Pembungkus tampilan untuk nominal rupiah yang SUDAH diformat — bukan
 * pengganti formatIdr(). Pemanggil tetap memformat sendiri (termasuk tanda
 * +/− di entry-list.tsx); komponen ini cuma memutuskan menunjukkan hasilnya
 * atau mask.
 *
 * Lebar mask TETAP (bukan mengikuti panjang digit aslinya) — kalau mengikuti,
 * jumlah digit sendiri jadi bocoran kecil soal besar-kecilnya angka, padahal
 * itu justru yang coba disembunyikan.
 */
export function Amount({ children }: { children: string }) {
  const { visible } = useBalanceVisibility();
  return visible
    ? <>{children}</>
    : <span aria-label="Nominal disembunyikan">••••••</span>;
}
