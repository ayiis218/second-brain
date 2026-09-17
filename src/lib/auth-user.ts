import { cache } from "react";

import { auth, OWNER_EMAIL } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Satu-satunya sumber identitas user untuk kode aplikasi.
 *
 * Fungsi repository TIDAK menerima userId sebagai parameter — mereka
 * memanggil requireUserId() sendiri. Pemanggil tidak bisa lupa mengirim
 * sesuatu yang memang tidak perlu dikirim.
 */

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Id user yang DIPASTIKAN ada di database.
 *
 * `session.user.id` berasal dari `token.sub` di dalam JWT, dan JWT bisa
 * bertahan lebih lama daripada baris User yang dirujuknya — token lama tetap
 * dianggap sah oleh NextAuth meski barisnya sudah tidak ada. Memakainya
 * mentah-mentah menghasilkan pelanggaran foreign key yang membingungkan,
 * jauh dari penyebabnya.
 *
 * Karena itu id-nya diverifikasi, dengan email sebagai jalur pemulihan —
 * email unik di skema dan berasal dari provider, bukan dari token.
 *
 * Dibungkus `cache()` supaya verifikasinya satu query per request, bukan
 * per pemanggilan repository.
 */
export const requireUserId = cache(async (): Promise<string> => {
  const user = await getSessionUser();
  if (!user) {
    // Fail closed. Query tanpa identitas tidak boleh diteruskan ke database
    // dengan alasan apa pun.
    throw new Error("Tidak ada sesi aktif.");
  }

  if (user.id) {
    const byId = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  if (user.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    if (byEmail) {
      console.warn(
        `[auth] Sesi membawa id "${user.id}" yang tidak ada di database; ` +
          `dipulihkan lewat email ke "${byEmail.id}". ` +
          `Biasanya berarti JWT dibuat sebelum baris User yang sekarang.`,
      );
      return byEmail.id;
    }
  }

  throw new Error("Sesi menunjuk akun yang sudah tidak ada. Silakan keluar lalu masuk lagi.");
});

/**
 * Pemilik punya dua modul eksklusif: Finance sync (Fase 3) dan Legacy
 * (Fase 5). Lihat rencana-aplikasi-second-brain.md §5 dan §7.
 */
export async function isOwner(): Promise<boolean> {
  if (!OWNER_EMAIL) return false;
  const user = await getSessionUser();
  return user?.email?.trim().toLowerCase() === OWNER_EMAIL;
}
