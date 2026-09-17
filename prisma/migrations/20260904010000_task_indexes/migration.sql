-- Fase 2.3 — index untuk query task.
--
-- Task disimpan di content JSONB, bukan tabel terpisah (lihat
-- rencana-fase-2-second-brain.md §3). Yang sebenarnya dibutuhkan tabel
-- terpisah adalah performa query, dan itu diselesaikan expression index
-- parsial di bawah — tanpa menduplikasi sumber kebenaran.
--
-- Parsial (WHERE type = 'task') supaya index hanya memuat baris yang relevan.

CREATE INDEX "Entry_task_status_idx"
  ON "Entry" ("userId", (content->>'status'))
  WHERE type = 'task' AND "deletedAt" IS NULL;

CREATE INDEX "Entry_task_dueAt_idx"
  ON "Entry" ("userId", (content->>'dueAt'))
  WHERE type = 'task' AND "deletedAt" IS NULL;
