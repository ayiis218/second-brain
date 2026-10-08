import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { requireVaultAccess } from "./access";
import { prisma } from "@/lib/prisma";

/**
 * PIN tambahan khusus modul Legacy — lapis "pastikan ini benar kamu" di atas
 * sesi Google yang sudah sah, tapi bisa berumur sampai 7 hari (lihat
 * `session.maxAge` di src/auth.ts). Siapa pun yang memegang perangkat yang
 * sudah login bisa langsung membuka vault tanpa PIN ini.
 *
 * Dua hal yang membuat PIN ini bukan sekadar gerbang kosmetik di klien:
 *
 * 1. Hash-nya scrypt + salt acak per-user (bukan plaintext), dibandingkan
 *    lewat timingSafeEqual — pola yang sama dengan cron-auth.ts.
 * 2. "Unlocked" dibuktikan lewat cookie yang DITANDATANGANI (HMAC dengan
 *    AUTH_SECRET), diperiksa ulang di SERVER setiap render /legacy — bukan
 *    state React/localStorage yang bisa dipalsukan dari klien begitu saja.
 *    Tanpa ini, isi vault tetap akan terdekripsi dan terkirim ke browser
 *    dalam RSC payload sebelum PIN sempat diperiksa; pengecekannya jadi
 *    cuma kosmetik.
 */

const PIN_PATTERN = /^\d{4,6}$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const UNLOCK_MINUTES = 15;
const UNLOCK_COOKIE = "sb_vault_unlock";

function hmacSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET belum diset.");
  return secret;
}

function derive(pin: string, salt: Buffer): Buffer {
  return scryptSync(pin, salt, 64);
}

/**
 * Menyalin ke ArrayBuffer baru — bukan sekadar cast. Prisma 7 menuntut
 * `Uint8Array<ArrayBuffer>` untuk kolom Bytes, sementara `Buffer.buffer`
 * bertipe `ArrayBufferLike` yang juga mencakup `SharedArrayBuffer` dan
 * ditolak type checker-nya. Pola yang sama dengan `bytes()` di crypto.ts.
 */
function toBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)) as Uint8Array<ArrayBuffer>;
}

export async function hasPinSet(): Promise<boolean> {
  const userId = await requireVaultAccess();
  const access = await prisma.legacyAccess.findUnique({
    where: { userId },
    select: { pinHash: true },
  });
  return access?.pinHash != null;
}

/**
 * Dipakai untuk setup pertama DAN reset dari Settings — keduanya "tulis PIN
 * baru," bedanya cuma dari mana dipanggil. `upsert`, bukan `update`: pemilik
 * aplikasi digrandfather di hasVaultAccess() dan sering TIDAK punya baris
 * LegacyAccess sama sekali sampai titik ini.
 */
export async function setPin(pin: string): Promise<void> {
  const userId = await requireVaultAccess();
  if (!PIN_PATTERN.test(pin)) {
    throw new Error("PIN harus 4-6 digit angka.");
  }

  const salt = randomBytes(16);
  const hash = derive(pin, salt);

  await prisma.legacyAccess.upsert({
    where: { userId },
    create: { userId, status: "ACTIVE", pinHash: toBytes(hash), pinSalt: toBytes(salt) },
    update: {
      pinHash: toBytes(hash),
      pinSalt: toBytes(salt),
      // Reset juga: PIN baru tidak boleh mewarisi penguncian dari PIN lama.
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    },
  });
}

/**
 * Melempar dengan pesan yang aman ditunjukkan apa adanya (lewat
 * useAsyncAction -> toast) — tidak pernah membocorkan berapa percobaan
 * sudah benar, hanya berapa yang tersisa.
 */
export async function verifyPin(pin: string): Promise<void> {
  const userId = await requireVaultAccess();

  const access = await prisma.legacyAccess.findUnique({
    where: { userId },
    select: { pinHash: true, pinSalt: true, pinFailedAttempts: true, pinLockedUntil: true },
  });
  if (!access?.pinHash || !access.pinSalt) {
    throw new Error("PIN belum diset.");
  }

  if (access.pinLockedUntil && access.pinLockedUntil > new Date()) {
    const minutesLeft = Math.ceil((access.pinLockedUntil.getTime() - Date.now()) / 60_000);
    throw new Error(`Terlalu banyak percobaan salah. Coba lagi dalam ${minutesLeft} menit.`);
  }

  const submitted = derive(pin, Buffer.from(access.pinSalt));
  const stored = Buffer.from(access.pinHash);
  const matches = submitted.length === stored.length && timingSafeEqual(submitted, stored);

  if (!matches) {
    const attempts = access.pinFailedAttempts + 1;
    const lockedOut = attempts >= MAX_FAILED_ATTEMPTS;

    await prisma.legacyAccess.update({
      where: { userId },
      data: {
        pinFailedAttempts: lockedOut ? 0 : attempts,
        pinLockedUntil: lockedOut
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          : null,
      },
    });

    throw lockedOut
      ? new Error(`Terlalu banyak percobaan salah. Coba lagi dalam ${LOCKOUT_MINUTES} menit.`)
      : new Error(`PIN salah. ${MAX_FAILED_ATTEMPTS - attempts} percobaan tersisa.`);
  }

  await prisma.legacyAccess.update({
    where: { userId },
    data: { pinFailedAttempts: 0, pinLockedUntil: null },
  });

  await armUnlockCookie(userId);
}

/** Baris tanda tangan: `<userId>.<expiresAtMs>.<hmac>` — tiga bagian dipisah titik. */
function signUnlockToken(userId: string, expiresAtMs: number): string {
  const payload = `${userId}.${expiresAtMs}`;
  const mac = createHmac("sha256", hmacSecret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

async function armUnlockCookie(userId: string): Promise<void> {
  const expiresAtMs = Date.now() + UNLOCK_MINUTES * 60_000;
  const token = signUnlockToken(userId, expiresAtMs);

  (await cookies()).set(UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/legacy",
    expires: new Date(expiresAtMs),
  });
}

/**
 * Diperiksa di server pada SETIAP render /legacy — cookie yang valid tapi
 * untuk userId lain, atau yang tanda tangannya tidak cocok, dianggap
 * terkunci. Ini jalur satu-satunya yang boleh menyatakan vault "unlocked";
 * tidak ada state klien yang dipercaya untuk itu.
 */
export async function isUnlocked(): Promise<boolean> {
  const userId = await requireVaultAccess();

  const raw = (await cookies()).get(UNLOCK_COOKIE)?.value;
  if (!raw) return false;

  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [cookieUserId, expiresAtRaw, mac] = parts;

  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return false;
  if (cookieUserId !== userId) return false;

  const expected = createHmac("sha256", hmacSecret())
    .update(`${cookieUserId}.${expiresAtRaw}`)
    .digest("base64url");

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
