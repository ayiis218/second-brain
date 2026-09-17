-- Fase 3 — posisi sinkronisasi dari finance-dashboard.
--
-- Satu baris per sumber, tanpa userId: finance-dashboard single-user, jadi
-- hasil sync-nya selalu milik pemilik (rencana induk §6.3).

CREATE TABLE "SyncState" (
  "source"    TEXT NOT NULL,
  "txCursor"  TEXT,
  "delCursor" TEXT,
  "lastRunAt" TIMESTAMP(3),
  "lastError" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncState_pkey" PRIMARY KEY ("source")
);
