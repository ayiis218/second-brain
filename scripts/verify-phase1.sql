-- Verifikasi Fase 1 di level database (rencana-fase-1-second-brain.md §5 c, d, g).
-- Jalankan: npm run db:sql -- --file scripts/verify-phase1.sql
-- Setiap statement adalah request terpisah, jadi juga transaksi terpisah.

DELETE FROM "Entry" WHERE id LIKE 'verify-%';

-- (c1) Insert lewat SQL mentah — Prisma tidak terlibat sama sekali.
INSERT INTO "Entry" (id, type, title, content, "occurredAt")
VALUES ('verify-1', 'note', 'Rapat mingguan', '{"body":"catatan uji pencarian kambing"}', now());

-- Trigger harus sudah mengisi searchVector dan updatedAt.
SELECT id, "searchVector" IS NOT NULL AS vector_terisi, "updatedAt" IS NOT NULL AS updated_terisi
FROM "Entry" WHERE id = 'verify-1';

-- (c2) Update lewat SQL mentah — updatedAt harus naik tanpa disentuh aplikasi.
UPDATE "Entry" SET title = 'Rapat mingguan revisi' WHERE id = 'verify-1';

SELECT id, "updatedAt" > "createdAt" AS updated_naik FROM "Entry" WHERE id = 'verify-1';

-- (d1) Full-text search atas body (weight B).
SELECT id, title FROM "Entry"
WHERE "searchVector" @@ plainto_tsquery('simple', 'kambing');

-- (d2) Full-text search atas title (weight A) — membuktikan title ikut terindeks
-- dan searchVector diperbarui saat UPDATE, bukan hanya saat INSERT.
SELECT id, title FROM "Entry"
WHERE "searchVector" @@ plainto_tsquery('simple', 'revisi');

-- (g1) Kunci idempotensi sync: sourceId sama untuk source sama harus ditolak.
INSERT INTO "Entry" (id, type, content, "occurredAt", source, "sourceId")
VALUES ('verify-2', 'note', '{"body":"a"}', now(), 'FINANCE', 'X');

-- Statement berikut HARUS gagal dengan unique violation.
INSERT INTO "Entry" (id, type, content, "occurredAt", source, "sourceId")
VALUES ('verify-3', 'note', '{"body":"b"}', now(), 'FINANCE', 'X');

-- (g2) Entry native ber-sourceId NULL harus boleh berkali-kali —
-- ini yang membuat constraint di atas tidak mengganggu data non-sync.
INSERT INTO "Entry" (id, type, content, "occurredAt")
VALUES ('verify-4', 'note', '{"body":"native satu"}', now());

INSERT INTO "Entry" (id, type, content, "occurredAt")
VALUES ('verify-5', 'note', '{"body":"native dua"}', now());

SELECT count(*)::int AS native_null_sourceid FROM "Entry"
WHERE id IN ('verify-4', 'verify-5');

DELETE FROM "Entry" WHERE id LIKE 'verify-%';
