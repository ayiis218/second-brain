-- Fase 5A — vault Legacy.
--
-- Tabel terpisah dari "Entry", dan itu keputusan keamanan, bukan gaya.
-- Trigger entry_before_write mengindeks title dan content->>'body' ke
-- searchVector dalam TEKS BIASA. Menyimpan nomor rekening sebagai Entry
-- akan membocorkannya lewat satu dump database, seberapa pun rapi
-- enkripsi di kolom lain. Tabel ini sengaja tidak punya trigger apa pun.

CREATE TYPE "LegacyCategory" AS ENUM (
  'KEUANGAN', 'INVESTASI', 'ASET', 'DOKUMEN',
  'AKSES_DIGITAL', 'UTANG_PIUTANG', 'KONTAK', 'INSTRUKSI'
);

CREATE TABLE "LegacyItem" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "category"   "LegacyCategory" NOT NULL,
  -- Seluruh isi item. Tidak ada kolom plaintext selain category.
  "ciphertext" BYTEA NOT NULL,
  "iv"         BYTEA NOT NULL,
  "authTag"    BYTEA NOT NULL,
  "wrappedKey" BYTEA NOT NULL,
  "keyVersion" INTEGER NOT NULL DEFAULT 1,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegacyItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegacyAttachment" (
  "id"         TEXT NOT NULL,
  "itemId"     TEXT NOT NULL,
  "objectKey"  TEXT NOT NULL,
  "mimeType"   TEXT NOT NULL,
  "sizeBytes"  INTEGER NOT NULL,
  "iv"         BYTEA NOT NULL,
  "authTag"    BYTEA NOT NULL,
  "wrappedKey" BYTEA NOT NULL,
  "keyVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegacyAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LegacyItem_userId_category_sortOrder_idx"
  ON "LegacyItem"("userId", "category", "sortOrder");

CREATE INDEX "LegacyAttachment_itemId_idx" ON "LegacyAttachment"("itemId");

ALTER TABLE "LegacyItem" ADD CONSTRAINT "LegacyItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LegacyAttachment" ADD CONSTRAINT "LegacyAttachment_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "LegacyItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
