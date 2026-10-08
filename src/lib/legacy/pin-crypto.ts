import { scryptSync } from "node:crypto";

/**
 * Logic murni hash PIN + keputusan throttle — sengaja TANPA impor
 * Next.js/Prisma/next-auth (cuma `node:crypto`, yang resolve di mana pun).
 * `pin.ts` tetap pemilik I/O (Prisma, cookies()); berkas ini cuma angka dan
 * byte. Lihat habit-streak.ts untuk alasan pemisahan yang sama.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export function derive(pin: string, salt: Buffer): Buffer {
  return scryptSync(pin, salt, 64);
}

/** Murni — tidak baca jam sistem sendiri, supaya test-able tanpa mock Date. */
export function isLockedOut(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil != null && lockedUntil > now;
}

/**
 * Keputusan throttle setelah satu PIN salah — dipisah dari penulisan
 * Prisma-nya di pin.ts supaya logic "kapan mengunci" bisa diuji tanpa
 * database. `now` punya default supaya pemanggil normal tidak perlu
 * mengirimnya; test yang butuh determinisme tinggal mengirim nilainya sendiri.
 */
export function nextFailureState(
  currentAttempts: number,
  now: Date = new Date(),
): { attempts: number; lockedUntil: Date | null } {
  const attempts = currentAttempts + 1;
  const lockedOut = attempts >= MAX_FAILED_ATTEMPTS;
  return {
    attempts: lockedOut ? 0 : attempts,
    lockedUntil: lockedOut ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) : null,
  };
}

export { MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES };
