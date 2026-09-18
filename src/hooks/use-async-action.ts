"use client";

import { useTransition } from "react";
import { toast } from "sonner";

/**
 * Menjalankan server action di dalam transition, dengan penanganan galat yang
 * seragam.
 *
 * Pola ini sebelumnya diketik ulang di belasan komponen — `useTransition`,
 * `try/catch`, lalu `toast.error(error instanceof Error ? error.message : …)`.
 * Konsekuensinya bukan cuma panjang: tiap salinan bebas lupa satu bagiannya,
 * dan aksi yang gagal diam-diam adalah kegagalan yang paling mahal di
 * aplikasi tulis-catatan.
 *
 * Aksinya diberikan per pemanggilan, bukan saat hook dibuat, karena satu
 * komponen sering punya beberapa aksi yang berbagi satu keadaan `pending`
 * (mis. simpan + hapus di editor). Bentuk ini menyalin `run()` lokal yang
 * sudah lebih dulu ditulis di trash-list.tsx.
 */
export type ActionMessages = {
  /**
   * Toast saat berhasil. Dikosongkan kalau hasilnya sudah terlihat sendiri di
   * layar, atau kalau aksinya berpindah halaman — toast yang muncul bersamaan
   * dengan navigasi hanya sempat terbaca separuh.
   */
  success?: string;
  /** Pesan cadangan kalau yang dilempar bukan `Error` — mis. kegagalan jaringan. */
  error: string;
};

export function useAsyncAction() {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>, messages: ActionMessages) {
    startTransition(async () => {
      try {
        await action();
        if (messages.success) toast.success(messages.success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : messages.error);
      }
    });
  }

  return { pending, run };
}
