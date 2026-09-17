-- Fase 2.0 — multi-user, isolasi data, dan undangan.
--
-- Ditulis tangan, bukan hasil `prisma migrate diff`: kolom userId tidak bisa
-- langsung NOT NULL karena baris lama belum punya nilai. Urutannya
-- add nullable -> backfill -> SET NOT NULL, dan SET NOT NULL sengaja
-- dibiarkan gagal kalau masih ada NULL tersisa. Lebih baik migrasi batal
-- daripada diam-diam menghapus baris yang tidak punya pemilik.
--
-- Seluruh berkas ini dijalankan dalam satu transaksi oleh
-- scripts/apply-migration.mjs.

-- ---------------------------------------------------------------------------
-- 1. Tabel undangan
-- ---------------------------------------------------------------------------

CREATE TABLE "Invite" (
  "id"          TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "email"       TEXT,
  "createdById" TEXT NOT NULL,
  "usedById"    TEXT,
  "usedAt"      TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "revokedAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
CREATE INDEX "Invite_expiresAt_idx" ON "Invite"("expiresAt");
CREATE INDEX "Invite_createdById_idx" ON "Invite"("createdById");

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedById_fkey"
  FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Entry.userId
-- ---------------------------------------------------------------------------

ALTER TABLE "Entry" ADD COLUMN "userId" TEXT;

-- Backfill: saat ini hanya ada satu user (pemilik), jadi seluruh baris lama
-- adalah miliknya. Kalau tabel User kosong, UPDATE ini tidak mengisi apa pun
-- dan SET NOT NULL di bawah akan menggagalkan seluruh transaksi.
UPDATE "Entry"
   SET "userId" = (SELECT "id" FROM "User" ORDER BY "id" LIMIT 1)
 WHERE "userId" IS NULL;

ALTER TABLE "Entry" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Entry" ADD CONSTRAINT "Entry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraint idempotensi sync: dari global jadi per user.
DROP INDEX "Entry_source_sourceId_key";
CREATE UNIQUE INDEX "Entry_userId_source_sourceId_key"
  ON "Entry"("userId", "source", "sourceId");

-- Semua index diawali userId, kalau tidak setiap query memindai
-- baris milik seluruh user.
DROP INDEX "Entry_occurredAt_id_idx";
DROP INDEX "Entry_type_occurredAt_idx";
DROP INDEX "Entry_deletedAt_idx";

CREATE INDEX "Entry_userId_occurredAt_id_idx"
  ON "Entry"("userId", "occurredAt" DESC, "id");
CREATE INDEX "Entry_userId_type_occurredAt_idx"
  ON "Entry"("userId", "type", "occurredAt" DESC);
CREATE INDEX "Entry_userId_deletedAt_idx"
  ON "Entry"("userId", "deletedAt");

-- ---------------------------------------------------------------------------
-- 3. Tag.userId — nama tag jadi unik PER USER
-- ---------------------------------------------------------------------------

ALTER TABLE "Tag" ADD COLUMN "userId" TEXT;

UPDATE "Tag"
   SET "userId" = (SELECT "id" FROM "User" ORDER BY "id" LIMIT 1)
 WHERE "userId" IS NULL;

ALTER TABLE "Tag" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tanpa perubahan ini, tag 'kerja' milik satu user memblokir
-- semua user lain memakai nama yang sama.
DROP INDEX "Tag_name_key";
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- ---------------------------------------------------------------------------
-- 4. EntryLink.userId
-- ---------------------------------------------------------------------------

ALTER TABLE "EntryLink" ADD COLUMN "userId" TEXT;

-- Diturunkan dari entry asalnya, bukan dari tabel User — link selalu
-- mengikuti pemilik entry yang ditautkan.
UPDATE "EntryLink" l
   SET "userId" = e."userId"
  FROM "Entry" e
 WHERE e."id" = l."fromId" AND l."userId" IS NULL;

ALTER TABLE "EntryLink" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "EntryLink" ADD CONSTRAINT "EntryLink_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "EntryLink_userId_idx" ON "EntryLink"("userId");
