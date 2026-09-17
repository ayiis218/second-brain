-- Fase 3 (revisi arah) — posisi keuangan, bukan riwayat transaksi.
--
-- Tidak ada cursor, tombstone, maupun idempotensi: ini foto keadaan, dan
-- tiap pengambilan menimpa yang sebelumnya.

CREATE TABLE "FinanceSnapshot" (
  "source"     TEXT NOT NULL,
  "payload"    JSONB NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "fetchedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError"  TEXT,
  CONSTRAINT "FinanceSnapshot_pkey" PRIMARY KEY ("source")
);
