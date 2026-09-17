import { Resend } from "resend";

/**
 * Notifikasi keamanan.
 *
 * Tanpa ini, kebocoran bisa berlangsung sampai token kedaluwarsa tanpa
 * pemiliknya sadar — dan tombol "keluarkan semua perangkat" tidak berguna
 * kalau tidak ada yang memberi tahu kapan harus menekannya.
 *
 * Fail SOFT, bukan fail closed: kegagalan mengirim email tidak boleh
 * menggagalkan login atau export. Kebalikan dari gerbang keamanan lain di
 * proyek ini, dan disengaja — ini pemberi tahu, bukan penjaga pintu.
 */

const from = process.env.NOTIFY_FROM?.trim();
const apiKey = process.env.RESEND_API_KEY?.trim();

export type SecurityEvent =
  | { kind: "new_device"; label: string; at: Date }
  | { kind: "sessions_revoked"; at: Date }
  | { kind: "data_exported"; format: string; at: Date };

function compose(event: SecurityEvent, appUrl: string) {
  const when = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(event.at);

  switch (event.kind) {
    case "new_device":
      return {
        subject: "Second Brain — login dari perangkat baru",
        body:
          `Ada login dari perangkat yang belum pernah terlihat.\n\n` +
          `Perangkat : ${event.label}\nWaktu     : ${when}\n\n` +
          `Kalau ini bukan kamu, buka ${appUrl}/settings lalu tekan ` +
          `"Keluar dari semua perangkat". Itu memutus akses seluruh ` +
          `perangkat tanpa menghapus data apa pun.`,
      };
    case "sessions_revoked":
      return {
        subject: "Second Brain — seluruh perangkat dikeluarkan",
        body:
          `Seluruh sesi dicabut pada ${when}.\n\n` +
          `Kalau bukan kamu yang melakukannya, segera ganti kata sandi akun ` +
          `Google yang dipakai login dan nyalakan verifikasi dua langkah.`,
      };
    case "data_exported":
      return {
        subject: "Second Brain — data diunduh",
        body:
          `Seluruh datamu diunduh dalam format ${event.format} pada ${when}.\n\n` +
          `Satu permintaan ini memuat semua entry, tag, dan tautanmu. ` +
          `Kalau bukan kamu, keluarkan semua perangkat di ${appUrl}/settings.`,
      };
  }
}

export async function notifySecurity(to: string, event: SecurityEvent): Promise<void> {
  // AUTH_URL adalah nama di NextAuth v5; NEXTAUTH_URL hanya didukung untuk
  // kompatibilitas v4. Keduanya diperiksa supaya tautan di email tidak
  // diam-diam menunjuk localhost di production.
  const appUrl =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3001";
  const { subject, body } = compose(event, appUrl);

  if (!apiKey || !from) {
    // Belum dikonfigurasi. Dicatat supaya kejadiannya tetap terlihat di log,
    // bukan hilang diam-diam.
    console.warn(`[security] ${event.kind} untuk ${to} — RESEND_API_KEY/NOTIFY_FROM belum diset.`);
    return;
  }

  try {
    await new Resend(apiKey).emails.send({ from, to, subject, text: body });
  } catch (error) {
    console.error("[security] gagal mengirim notifikasi:", error);
  }
}
