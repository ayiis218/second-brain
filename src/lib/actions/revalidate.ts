import { revalidatePath } from "next/cache";

/**
 * Halaman yang menampilkan daftar entry, jadi harus ikut segar setiap kali
 * ada entry yang lahir, berubah, atau hilang.
 *
 * Dikumpulkan di satu tempat karena inilah yang paling mudah lupa: menambah
 * halaman berisi daftar entry tanpa menambahkannya di sini membuat halaman
 * itu menampilkan data basi, dan gejalanya baru terasa jauh dari penyebabnya.
 *
 * Bukan berkas `"use server"` — ini helper sinkron yang dipanggil action lain,
 * bukan action yang dipanggil klien.
 */
export function revalidateEntryViews() {
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath("/task");
  revalidatePath("/journal");
}
