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

**Di jaringan ini, port 5432 ke Neon tidak bisa dijangkau** — `prisma migrate` / `prisma migrate status` / `prisma studio` gagal dengan `P1001`. Masalah yang sama pernah terjadi di finance-dashboard. Jadi jalur yang dipakai adalah driver HTTP Neon (port 443):

```bash
npm run db:migrate:http 20260903000000_init_core
```

Script itu memecah `migration.sql` dengan splitter yang menghormati dollar-quoting, karena migrasi ini memuat fungsi PL/pgSQL, lalu mencatat hasilnya ke `_prisma_migrations` supaya `prisma migrate deploy` mengenalinya kalau suatu saat dijalankan dari jaringan yang port 5432-nya lancar.

`npm run db:migrate` (`prisma migrate deploy`) tetap jadi jalur utama di lingkungan yang normal.

### SQL ad-hoc

Karena `prisma studio` dan `psql` ikut terhalang, query manual lewat:

```bash
npm run db:sql -- "SELECT count(*) FROM \"Entry\""
npm run db:sql -- --file scripts/verify-phase1.sql
```

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

Daftar lengkap ada di `../rencana-fase-1-second-brain.md` §5. Bagian database (c, d, g) sudah otomatis:

```bash
npm run db:sql -- --file scripts/verify-phase1.sql
```

Yang diperiksa: trigger mengisi `searchVector` dan menaikkan `updatedAt` walau baris ditulis lewat SQL mentah, FTS menemukan baris lewat `body` maupun `title`, `sourceId` ganda ditolak, dan entry native ber-`sourceId` NULL tetap boleh berkali-kali.

> Script ini memuat satu INSERT yang **memang harus gagal** (uji unique constraint), jadi keluarannya berisi satu baris `ERROR: duplicate key ...` dan exit code non-nol. Itu tanda lulus, bukan gagal.

Sisanya (a: login Google, b: quick capture di browser) dijalankan manual di `http://localhost:3001`.
