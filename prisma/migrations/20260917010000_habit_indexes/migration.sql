-- Fase 4 — kebiasaan (habit) dan centang hariannya.
--
-- Satu kebiasaan hanya boleh tercentang SEKALI per hari. Aturan itu
-- ditegakkan database, bukan hanya kode: dua permintaan bersamaan (mis.
-- ketukan ganda di mobile) tidak bisa sama-sama lolos.
--
-- Kuncinya memakai content->>'dayKey' — string 'YYYY-MM-DD' dalam WIB yang
-- dihitung aplikasi lewat lib/time.ts. Menurunkannya dari "occurredAt" di
-- dalam index akan memindahkan aturan batas hari ke SQL, padahal seluruh
-- aplikasi sudah sepakat menaruhnya di satu tempat.

CREATE UNIQUE INDEX "Entry_habit_log_day_key"
  ON "Entry" ("userId", (content->>'habitId'), (content->>'dayKey'))
  WHERE type = 'habit_log' AND "deletedAt" IS NULL;

-- Menghitung streak membaca seluruh log satu kebiasaan, terurut mundur.
CREATE INDEX "Entry_habit_log_lookup"
  ON "Entry" ("userId", (content->>'habitId'), (content->>'dayKey') DESC)
  WHERE type = 'habit_log' AND "deletedAt" IS NULL;
