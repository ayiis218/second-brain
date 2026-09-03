# Second Brain

Aplikasi personal single-user: journal, task, habit, notes, timeline — dengan data finance ditarik read-only dari `finance-dashboard` (Fase 3).

Rencana lengkap ada di `../rencana-aplikasi-second-brain.md`.
Rencana fase ini ada di `../rencana-fase-1-second-brain.md`.

Status: **Fase 1 (fondasi)** — login, quick capture, daftar entry.

## Stack

Next.js 16 (App Router) · React 19 · Prisma 7 + Neon Postgres · NextAuth v5 · Tailwind v4 + shadcn/ui (base-ui) · Zod 4

## Menjalankan

```bash
cp .env.example .env      # lalu isi nilainya
npm install
npm run db:migrate        # atau: npm run db:migrate:http 20260903000000_init_core
npm run db:generate
npm run dev               # http://localhost:3001
```

Port `3001` dipakai supaya bisa jalan berdampingan dengan `finance-dashboard` di `3000`.

### Environment

| Variable | Catatan |
|---|---|
| `DATABASE_URL` | Neon Postgres. **Harus database berbeda** dari finance-dashboard. |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Boleh pakai ulang OAuth client finance-dashboard; cukup tambahkan redirect URI `http://localhost:3001/api/auth/callback/google`. |
| `ALLOWED_EMAIL` | Satu-satunya email yang boleh login. |

### Migrasi

`npm run db:migrate` (`prisma migrate deploy`) adalah jalur utama. Kalau gagal dengan TLS reset ke Neon di port 5432 — masalah yang pernah terjadi di finance-dashboard — pakai jalur HTTP:

```bash
npm run db:migrate:http 20260903000000_init_core
```

Script itu memecah `migration.sql` dengan splitter yang menghormati dollar-quoting, karena migrasi ini memuat fungsi PL/pgSQL.

## Aturan yang ditegakkan

Dua aturan tidak bisa dijaga compiler, jadi dijaga `npm run check:gates`:

1. **`prisma.entry.*` hanya boleh dipanggil dari `src/lib/entries/repository.ts`.** Semua tulis ke `Entry.content` melewati `parseEntryContent()` di `src/lib/entries/schemas.ts`. Ini yang menjaga kolom JSONB tetap punya bentuk.
2. **`startOfDay`/`endOfDay` hanya boleh dipanggil dari `src/lib/time.ts`.** Batas hari dihitung di `Asia/Jakarta` yang dipatok konstan — bukan dari browser, bukan UTC.

Jalankan sebelum commit:

```bash
npm run check:gates && npm run typecheck && npm run lint
```

## Catatan skema

- `Entry` adalah tabel pusat semua tipe data. `type` sengaja `String`, bukan enum — menambah tipe entry baru tidak boleh butuh migrasi. Kebenarannya dijaga registry Zod.
- `updatedAt` dan `searchVector` dipelihara **trigger Postgres** (`entry_before_write`), bukan Prisma. `@updatedAt` Prisma di-set client dan terlewat kalau baris berubah lewat SQL mentah atau cascade.
- `searchVector` bertipe `Unsupported("tsvector")`: Prisma tidak bisa menyentuhnya, dan memang tidak boleh. Search (Fase 2) membacanya lewat `$queryRaw`.
- Konfigurasi FTS `'simple'`, bukan `'english'` — konten campur Indonesia/Inggris.
- `@@unique([source, sourceId])` adalah kunci idempotensi sync Fase 3. Aman untuk entry native karena Postgres memperlakukan `NULL` sebagai saling berbeda.

## Verifikasi Fase 1

Setelah database tersambung, lihat daftar lengkap di `../rencana-fase-1-second-brain.md` §5. Yang paling penting:

```sql
-- (c) trigger updatedAt bekerja walau ditulis lewat SQL mentah
UPDATE "Entry" SET "title" = 'x' WHERE id = '<id>';
SELECT "createdAt", "updatedAt" FROM "Entry" WHERE id = '<id>';

-- (d) searchVector terisi dan bisa dicari
SELECT id, title FROM "Entry"
 WHERE "searchVector" @@ plainto_tsquery('simple', '<kata dari body>');

-- (g) constraint idempotensi sync menolak sourceId ganda
INSERT INTO "Entry" (id,type,content,"occurredAt",source,"sourceId")
VALUES ('t1','note','{"body":"a"}',now(),'FINANCE','X');
INSERT INTO "Entry" (id,type,content,"occurredAt",source,"sourceId")
VALUES ('t2','note','{"body":"b"}',now(),'FINANCE','X');  -- harus GAGAL
DELETE FROM "Entry" WHERE id IN ('t1','t2');
```
