"use server";

import { signOut } from "@/auth";
import { getSessionUser, isOwner, revokeAllSessions } from "@/lib/auth-user";
import { deleteOwnAccount } from "@/lib/entries/repository";
import { notifySecurity } from "@/lib/security/notify";

/**
 * Memutus akses SELURUH perangkat, termasuk yang sedang dipakai.
 *
 * Inilah jawaban untuk "HP hilang" — bukan menghapus data. Menghapus tidak
 * menarik kembali apa yang sudah terbaca, sementara mencabut sesi
 * menghentikan yang belum. Dan ini bisa dibatalkan: tinggal login lagi.
 */
export async function revokeAllSessionsAction() {
  const user = await getSessionUser();
  await revokeAllSessions();

  if (user?.email) {
    await notifySecurity(user.email, { kind: "sessions_revoked", at: new Date() });
  }

  await signOut({ redirectTo: "/login" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

/**
 * Syarat sebelum mengundang siapa pun (rencana induk §12): user harus bisa
 * menghapus dirinya sendiri beserta seluruh datanya.
 *
 * Pemilik tidak boleh menghapus akunnya lewat jalur ini — datanya menaungi
 * undangan user lain, dan penghapusan tak sengaja tidak bisa dibatalkan.
 */
export async function deleteAccountAction() {
  if (await isOwner()) {
    throw new Error("Akun pemilik tidak bisa dihapus lewat aplikasi.");
  }

  await deleteOwnAccount();
  await signOut({ redirectTo: "/login" });
}
