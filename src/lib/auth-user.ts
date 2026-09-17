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

type ValidatedSession = {
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

/**
 * Sesi yang sudah DIVERIFIKASI ke database.
 *
 * Dua hal diperiksa di sini, dan keduanya harus di satu tempat — kalau
 * ditempel di masing-masing pemanggil, satu jalur yang lupa memeriksanya
 * langsung membatalkan perlindungannya:
 *
 * 1. **Baris User-nya masih ada.** JWT bisa hidup lebih lama daripada baris
 *    yang dirujuknya; memakainya mentah-mentah menghasilkan pelanggaran
 *    foreign key yang jauh dari penyebabnya.
 *
 * 2. **Token diterbitkan setelah `sessionsValidAfter`.** Inilah cara memutus
 *    akses HP yang hilang: JWT tidak bisa dicabut karena berdiri sendiri,
 *    jadi yang dilakukan adalah menolak semua token yang lebih tua dari
 *    satu penanda waktu di sisi server.
 *
 * Dibungkus `cache()` supaya satu query per request, bukan per pemanggilan.
 */
const validatedSession = cache(async (): Promise<ValidatedSession | null> => {
  const session = await auth();
  if (!session?.user) return null;

  const { id, email, name, image, issuedAt } = session.user;

  // Lookup by id kalau ada, kalau tidak lewat email. Email jadi jalur
  // pemulihan untuk token lama yang id-nya sudah tidak cocok.
  const user = id
    ? await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, sessionsValidAfter: true },
      })
    : null;

  const resolved =
    user ??
    (email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, sessionsValidAfter: true },
        })
      : null);

  if (!resolved) return null;

  if (resolved.sessionsValidAfter && issuedAt) {
    // `iat` JWT dalam detik, kolomnya dalam milidetik.
    const tokenIssuedAt = new Date(issuedAt * 1000);
    if (tokenIssuedAt < resolved.sessionsValidAfter) {
      console.warn(`[auth] Token dicabut untuk ${resolved.email} — diterbitkan sebelum sessionsValidAfter.`);
      return null;
    }
  }

  return {
    userId: resolved.id,
    email: resolved.email,
    name: name ?? null,
    image: image ?? null,
  };
});

export async function getSessionUser() {
  const session = await validatedSession();
  if (!session) return null;
  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    image: session.image,
  };
}

export async function requireUserId(): Promise<string> {
  const session = await validatedSession();
  if (!session) {
    // Fail closed. Query tanpa identitas tidak boleh diteruskan ke database
    // dengan alasan apa pun.
    throw new Error("Tidak ada sesi aktif.");
  }
  return session.userId;
}

/**
 * Pemilik punya modul eksklusif: Finance (§6) dan Legacy (§7).
 * Memakai sesi yang SUDAH divalidasi — kalau tidak, halaman yang hanya
 * memanggil isOwner() akan melewati pemeriksaan pencabutan sesi.
 */
export async function isOwner(): Promise<boolean> {
  if (!OWNER_EMAIL) return false;
  const session = await validatedSession();
  return session?.email?.trim().toLowerCase() === OWNER_EMAIL;
}

/**
 * Mengeluarkan SELURUH perangkat, termasuk yang sedang dipakai.
 *
 * Tidak menghapus data apa pun — hanya memutus akses, dan bisa dipulihkan
 * dengan login ulang. Inilah jawaban untuk "HP hilang", bukan remote wipe:
 * menghapus data tidak menarik kembali apa yang sudah terbaca, sementara
 * mencabut sesi menghentikan yang belum.
 */
export async function revokeAllSessions(): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { sessionsValidAfter: new Date() },
  });
}
