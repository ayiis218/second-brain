import { isOwner, requireUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

/**
 * Entitlement Legacy Vault — menggantikan "satu OWNER_EMAIL" sebagai
 * penjaga akses modul ini. Lihat komentar model `LegacyAccess` di
 * prisma/schema.prisma untuk kenapa baris ini ada.
 *
 * Pembayaran sungguhan belum terhubung (fase berikutnya, lewat provider
 * yang dipilih via `/marketplace`). Untuk sekarang satu-satunya cara dapat
 * akses adalah masa coba yang dimulai `startVaultTrial()` saat pendaftaran
 * lewat /vault, atau menjadi pemilik aplikasi.
 */

const TRIAL_DAYS = 14;

/**
 * Cookie niat pendaftaran lewat /vault — pola yang sama dengan INVITE_COOKIE
 * di src/lib/invites.ts. Isinya cuma penanda, bukan bukti: callback signIn
 * di src/auth.ts tidak mempercayainya untuk apa pun selain "izinkan
 * pendaftaran tanpa undangan", dan createUser yang benar-benar memberi akses
 * lewat startVaultTrial() di bawah.
 */
export const VAULT_INTENT_COOKIE = "sb_vault_intent";

/** Pemilik digrandfather — tidak pernah butuh baris LegacyAccess maupun trial. */
export async function hasVaultAccess(): Promise<boolean> {
  if (await isOwner()) return true;

  const userId = await requireUserId();
  const access = await prisma.legacyAccess.findUnique({ where: { userId } });
  if (!access) return false;

  if (access.status === "ACTIVE") return true;
  if (access.status === "TRIAL") {
    // Trial yang tanggalnya sudah lewat tidak otomatis ditulis EXPIRED di
    // sini — baca murni, tanpa efek samping. Penulisan status sebenarnya
    // tugas job terpisah (src/lib/legacy/trial-expiry.ts, cron harian),
    // tapi fungsi ini TIDAK bergantung padanya: perbandingan tanggal
    // langsung di bawah tetap benar walau job-nya belum pernah berjalan.
    return !access.trialEndsAt || access.trialEndsAt > new Date();
  }
  return false;
}

/**
 * Gerbang modul Legacy. Pengganti `requireOwner()` lama — pesan dan sifat
 * fail-closed-nya sengaja sama persis: penolakan datar, bukan 403 yang
 * menjelaskan. Keberadaan modul ini pun tidak perlu dikonfirmasi ke
 * pemanggil yang tidak berhak.
 */
export async function requireVaultAccess(): Promise<string> {
  if (!(await hasVaultAccess())) {
    throw new Error("Tidak ditemukan.");
  }
  return requireUserId();
}

/**
 * Memulai masa coba — dipanggil sekali, dari event `createUser` di
 * src/auth.ts, saat pendaftaran datang dari /vault (bukan undangan Second
 * Brain biasa).
 */
export async function startVaultTrial(userId: string) {
  await prisma.legacyAccess.upsert({
    where: { userId },
    create: {
      userId,
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    },
    // update kosong: kalau baris sudah ada (mis. double-submit), biarkan
    // trial yang pertama yang berlaku, jangan reset jamnya.
    update: {},
  });
}
