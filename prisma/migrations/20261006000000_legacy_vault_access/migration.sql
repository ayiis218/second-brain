-- Legacy Vault sebagai produk berdiri sendiri: entitlement per-user
-- menggantikan "satu OWNER_EMAIL" sebagai penjaga akses modul Legacy.

CREATE TYPE "LegacyAccessStatus" AS ENUM ('TRIAL', 'ACTIVE', 'CANCELED', 'EXPIRED');

-- Jalur pendaftaran user — murni penanda nav, bukan kontrol akses.
-- Default "invite" supaya seluruh user yang sudah ada (Second Brain biasa)
-- tidak berubah perilakunya.
ALTER TABLE "User" ADD COLUMN "signupSource" TEXT NOT NULL DEFAULT 'invite';

CREATE TABLE "LegacyAccess" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "status"      "LegacyAccessStatus" NOT NULL DEFAULT 'TRIAL',
  "trialEndsAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegacyAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegacyAccess_userId_key" ON "LegacyAccess"("userId");

ALTER TABLE "LegacyAccess" ADD CONSTRAINT "LegacyAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
