import type { LegacyAccessStatus } from "@prisma/client";

import { isOwner } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

/**
 * Ringkasan funnel trial Legacy Vault — khusus pemilik aplikasi.
 *
 * SENGAJA lintas SEMUA user, bukan satu user yang sedang login — ini data
 * admin ("berapa trial aktif"), bukan vault milik siapa pun. Itu yang
 * membuatnya beda dari access.ts: setiap fungsi di sana scoped ke userId
 * pemanggil, dan access.ts didaftarkan di SYSTEM_PATHS pada
 * scripts/check-gates.mjs yang mewajibkan itu. Fungsi di berkas ini TIDAK
 * punya satu userId untuk disaring — sama seperti trash-retention.ts dan
 * trial-expiry.ts, karena itu hidup di berkas terpisah, bukan ditambahkan
 * ke access.ts.
 *
 * Sebelum ada ini, satu-satunya cara tahu angka funnel adalah `db:sql`
 * manual.
 */

const EXPIRING_SOON_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type VaultFunnelSummary = {
  counts: Record<LegacyAccessStatus, number>;
  expiringSoon: { email: string; daysLeft: number }[];
};

export async function listVaultFunnelSummary(): Promise<VaultFunnelSummary> {
  if (!(await isOwner())) throw new Error("Tidak ditemukan.");

  const grouped = await prisma.legacyAccess.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts: Record<LegacyAccessStatus, number> = {
    TRIAL: 0,
    ACTIVE: 0,
    EXPIRED: 0,
    CANCELED: 0,
  };
  for (const row of grouped) counts[row.status] = row._count._all;

  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY_MS);

  const expiring = await prisma.legacyAccess.findMany({
    where: { status: "TRIAL", trialEndsAt: { gt: now, lte: soon } },
    orderBy: { trialEndsAt: "asc" },
    select: { trialEndsAt: true, user: { select: { email: true } } },
  });

  return {
    counts,
    expiringSoon: expiring.map((row) => ({
      email: row.user.email,
      daysLeft: Math.ceil((row.trialEndsAt!.getTime() - now.getTime()) / DAY_MS),
    })),
  };
}
