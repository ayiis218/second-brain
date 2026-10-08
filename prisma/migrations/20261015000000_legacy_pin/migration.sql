-- PIN tambahan khusus modul Legacy. scrypt + salt acak per-user, disimpan
-- di LegacyAccess (tabel yang sudah jadi rumah untuk "apa saja yang
-- menggerbang modul ini") — bukan plaintext dalam bentuk apa pun.

ALTER TABLE "LegacyAccess"
  ADD COLUMN "pinHash" BYTEA,
  ADD COLUMN "pinSalt" BYTEA,
  ADD COLUMN "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pinLockedUntil" TIMESTAMP(3);
