-- Penjagaan akses — memutus sesi HP yang hilang.
--
-- JWT tidak bisa dicabut: token berdiri sendiri dan server tidak menyimpan
-- catatan apa pun tentangnya. Kolom di bawah adalah penggantinya — token
-- yang diterbitkan sebelum waktu ini ditolak, jadi menaikkannya sama
-- dengan mengeluarkan seluruh perangkat sekaligus.

ALTER TABLE "User" ADD COLUMN "sessionsValidAfter" TIMESTAMP(3);

-- Perangkat yang pernah dipakai login, supaya login dari perangkat BARU
-- bisa diberitahukan.
CREATE TABLE "KnownDevice" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnownDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnownDevice_userId_fingerprint_key"
  ON "KnownDevice"("userId", "fingerprint");
CREATE INDEX "KnownDevice_userId_lastSeenAt_idx"
  ON "KnownDevice"("userId", "lastSeenAt");

ALTER TABLE "KnownDevice" ADD CONSTRAINT "KnownDevice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
