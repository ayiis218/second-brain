/**
 * Pintu masuk tunggal seluruh server action.
 *
 * Barrel, bukan berkas berisi implementasi: tiap modul di bawahnya memegang
 * `"use server"`-nya sendiri, dan pemanggil cukup tahu satu alamat
 * (`@/lib/actions`). Dulu semuanya memang satu berkas — sampai berkas itu
 * memuat sembilan domain yang tidak saling berhubungan sama sekali.
 *
 * `revalidate.ts` sengaja TIDAK ikut diekspor: ia helper internal antar-action,
 * bukan aksi yang boleh dipanggil dari klien.
 */
export * from "./account";
export * from "./entry";
export * from "./finance";
export * from "./habit";
export * from "./invite";
export * from "./link";
export * from "./tag";
export * from "./task";
export * from "./trash";
