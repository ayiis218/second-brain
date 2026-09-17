import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Pendaftaran hanya lewat undangan. Modul ini adalah satu-satunya tempat
 * kode undangan dibuat, divalidasi, dan ditandai terpakai.
 *
 * Catatan: `Invite` sengaja TIDAK ikut scoping per-user di src/lib/db.ts.
 * Undangan divalidasi justru saat belum ada sesi — pemakainya belum jadi user.
 */

export const INVITE_COOKIE = "sb_invite";
const DEFAULT_TTL_DAYS = 14;

/** 32 karakter base64url dari CSPRNG — kode ini kredensial, bukan id. */
function generateCode() {
  return randomBytes(24).toString("base64url");
}

export async function createInvite(input: {
  createdById: string;
  email?: string | null;
  ttlDays?: number;
}) {
  const ttl = input.ttlDays ?? DEFAULT_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);

  return prisma.invite.create({
    data: {
      code: generateCode(),
      email: input.email?.trim().toLowerCase() || null,
      createdById: input.createdById,
      expiresAt,
    },
  });
}

export async function listInvites(createdById: string) {
  return prisma.invite.findMany({
    where: { createdById },
    orderBy: { createdAt: "desc" },
    include: { usedBy: { select: { email: true } } },
  });
}

export async function revokeInvite(id: string, createdById: string) {
  // updateMany + createdById: pemilik hanya bisa mencabut undangannya sendiri.
  return prisma.invite.updateMany({
    where: { id, createdById, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Cek tanpa mengubah apa pun — dipakai halaman /invite/[code]. */
export async function peekInvite(code: string) {
  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite) return null;
  if (invite.usedAt || invite.revokedAt) return null;
  if (invite.expiresAt <= new Date()) return null;
  return invite;
}

/**
 * Menandai undangan terpakai secara atomik.
 *
 * Syarat `usedAt: null` ada di dalam WHERE, bukan dicek lebih dulu di
 * JavaScript — dua permintaan bersamaan dengan kode sama hanya bisa
 * menghasilkan satu baris terupdate.
 *
 * `usedById` belum diisi di sini: saat callback signIn berjalan, user-nya
 * belum dibuat adapter. Pengisiannya menyusul di event createUser.
 */
export async function consumeInvite(code: string, email: string) {
  const now = new Date();
  const normalizedEmail = email.trim().toLowerCase();

  const result = await prisma.invite.updateMany({
    where: {
      code,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
      // Undangan yang dikunci ke satu email hanya boleh dipakai email itu.
      OR: [{ email: null }, { email: normalizedEmail }],
    },
    data: { usedAt: now },
  });

  return result.count === 1;
}

/** Melengkapi `usedById` setelah adapter membuat user-nya. */
export async function attachInviteUser(code: string, userId: string) {
  await prisma.invite.updateMany({
    where: { code, usedById: null },
    data: { usedById: userId },
  });
}
