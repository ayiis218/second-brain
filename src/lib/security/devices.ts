import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { notifySecurity } from "./notify";

/**
 * Mengenali perangkat yang dipakai login.
 *
 * Sidik jarinya lemah — hash dari user-agent saja. Itu disengaja: tujuannya
 * bukan mengidentifikasi perangkat secara pasti, melainkan membedakan
 * "browser yang sama seperti kemarin" dari "browser yang belum pernah
 * terlihat". Untuk memicu satu email peringatan, itu sudah cukup.
 *
 * Konsekuensi yang diterima: browser yang sama di HP dan laptop dengan versi
 * berbeda akan terhitung dua perangkat, dan dua HP identik terhitung satu.
 * Arah kesalahannya aman — lebih sering memberi tahu daripada melewatkan.
 */

function labelOf(userAgent: string): string {
  const os =
    /Android/i.test(userAgent) ? "Android" :
    /iPhone|iPad|iOS/i.test(userAgent) ? "iOS" :
    /Macintosh|Mac OS/i.test(userAgent) ? "macOS" :
    /Windows/i.test(userAgent) ? "Windows" :
    /Linux/i.test(userAgent) ? "Linux" : "perangkat lain";

  const browser =
    /Edg\//i.test(userAgent) ? "Edge" :
    /Chrome\//i.test(userAgent) ? "Chrome" :
    /Safari\//i.test(userAgent) ? "Safari" :
    /Firefox\//i.test(userAgent) ? "Firefox" : "browser lain";

  return `${browser} di ${os}`;
}

export async function recordSignIn(user: { userId: string; email: string }): Promise<void> {
  try {
    const userAgent = (await headers()).get("user-agent") ?? "";
    const fingerprint = createHash("sha256").update(userAgent).digest("hex").slice(0, 32);

    const existing = await prisma.knownDevice.findUnique({
      where: { userId_fingerprint: { userId: user.userId, fingerprint } },
      select: { id: true },
    });

    if (existing) {
      await prisma.knownDevice.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
      return;
    }

    const label = labelOf(userAgent);
    await prisma.knownDevice.create({
      data: { userId: user.userId, fingerprint, label },
    });

    // Perangkat pertama tidak perlu diberitahukan — itu pasti kamu sendiri,
    // dan email "ada login baru" tepat setelah login pertama hanya melatih
    // orang mengabaikan peringatan berikutnya.
    const count = await prisma.knownDevice.count({ where: { userId: user.userId } });
    if (count > 1) {
      await notifySecurity(user.email, { kind: "new_device", label, at: new Date() });
    }
  } catch (error) {
    // Pencatatan perangkat TIDAK boleh menggagalkan login.
    console.error("[security] gagal mencatat perangkat:", error);
  }
}

export async function listKnownDevices(userId: string) {
  return prisma.knownDevice.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, label: true, lastSeenAt: true },
  });
}
