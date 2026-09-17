# Second Brain

Aplikasi personal single-user: journal, task, habit, notes, timeline — dengan data finance ditarik read-only dari `finance-dashboard` (Fase 3).

Rencana lengkap ada di `../rencana-aplikasi-second-brain.md`.
Rencana fase ini ada di `../rencana-fase-1-second-brain.md`.

Status: **Fase 2 selesai** — multi-user tertutup, edit/hapus, task, journal, search, tagging, export.

## Multi-user

Pendaftaran **hanya lewat undangan** yang dibuat pemilik (`OWNER_EMAIL`) di `/settings`. Setiap user terisolasi penuh; modul Finance sync (Fase 3) dan Legacy (Fase 5) tetap eksklusif pemilik.

Isolasi datanya berlapis tiga — lihat `../rencana-aplikasi-second-brain.md` §5.1:

1. Akses Prisma untuk `Entry`/`Tag`/`EntryLink` hanya dari `src/lib/entries/repository.ts`.
2. Repository membaca sesi sendiri lewat `requireUserId()` — tidak ada fungsi yang menerima `userId` sebagai parameter, jadi tidak ada yang bisa lupa mengirimnya.
3. `src/lib/db.ts` menyuntikkan `where.userId` otomatis, dan **fail closed**: `findUnique`/`update`/`delete`/`upsert` pada model ber-scope melempar error, karena penyuntikan di sana bergantung pada perilaku yang terlalu halus untuk diandalkan.

Satu tempat yang tidak tertutup ketiganya: query `$queryRaw` pada Search. Filternya ditulis manual dan dijaga `npm run check:gates`.

```bash
npm run db:verify:isolation   # dua user sungguhan, 9 pemeriksaan
npm run db:verify:phase2      # search, index task, tag, soft delete
npm run db:verify:export      # pulang-pergi export -> import
```

## Export & restore

```bash
# unduh dari UI: /settings -> Unduh JSON
npm run db:import -- backup.json --email you@example.com
```

Import membuat **id baru** untuk setiap entry, tidak mempertahankan id lama — mempertahankannya akan bertabrakan bila berkas yang sama dipulihkan dua kali atau dipulihkan ke akun yang sudah berisi. Tautan antar-entry tetap utuh lewat peta id lama → id baru. `sourceId` sengaja dikosongkan: kunci idempotensi sync milik akun asal, dan membawanya ikut akan menabrak sync akun tujuan.

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

## UI: mobile-first

Aplikasi ini terutama diakses lewat ponsel, jadi layar kecil adalah kasus utama dan desktop adalah penyesuaian — bukan sebaliknya.

- **Navigasi**: bottom nav di `<md`, sidebar di `>=md`. Bottom bar dipilih ketimbang drawer karena navigasi di sini sering dipakai dan harus terjangkau ibu jari; drawer menuntut dua ketukan ke pojok atas layar.
- **Quick capture**: di mobile lewat FAB + bottom sheet, di desktop sebagai kartu inline. Menulis adalah aksi paling sering, jadi ia dapat target permanen dalam jangkauan ibu jari.
- **Target sentuh**: varian `size="touch"` (44px, mengecil jadi 36px di `md`). Ukuran shadcn bawaan (h-8/h-9) terlalu kecil untuk aksi utama di layar sentuh.
- **Safe area**: `viewportFit: "cover"` plus utilitas `.pb-safe` / `.bottom-safe`, supaya bottom nav dan FAB tidak tertimpa home indicator iOS atau gesture bar Android.
- **Input**: `text-base` di mobile (turun ke `text-sm` di `md`) — di bawah 16px, iOS otomatis zoom saat field difokus.
- **Animasi**: Motion, entrance saja (`whileInView` + `once`), dan dilewati sepenuhnya saat `prefers-reduced-motion`.

### Warna

Token warna mengikuti `finance-dashboard` apa adanya supaya dua aplikasi terlihat satu keluarga. Yang berbeda hanya **gradasi brand**, diambil dari palet ColorHunt `#3368a0 #66a3bf #c8dfdb #f2efe7`:

| Utilitas | Isi | Dipakai untuk |
|---|---|---|
| `.bg-brand-gradient` | `#3368a0 → #66a3bf → #c8dfdb` | Permukaan dekoratif **tanpa teks kecil** — FAB, header kartu login |
| `.bg-brand-soft` | `#c8dfdb → #f2efe7` | Permukaan **berteks** — brand bar, header aplikasi |

Pemisahan ini bukan gaya: ujung terang gradasi penuh (`#c8dfdb`) tidak punya kontras cukup untuk teks putih maupun navy berukuran kecil. `.bg-brand-soft` memakai separuh terang palet yang sama dengan teks `--foreground`, kontras >= 9:1.

## Aturan yang ditegakkan

Lima aturan tidak bisa dijaga compiler, jadi dijaga `npm run check:gates`:

1. **`prisma.entry.*` hanya dari `src/lib/entries/repository.ts`.** Semua tulis ke `Entry.content` melewati `parseEntryContent()`. Ini yang menjaga kolom JSONB tetap punya bentuk.
2. **`startOfDay`/`endOfDay` hanya dari `src/lib/time.ts`.** Batas hari dihitung di `Asia/Jakarta` yang dipatok konstan — bukan dari browser, bukan UTC.
3. **`prisma.tag` / `prisma.entryLink` juga hanya dari repository.**
4. **`@/lib/prisma` mentah tidak boleh diimpor komponen atau halaman** — client mentah melewati penyaring `userId`.
5. **Setiap `$queryRaw` wajib memuat `userId`.** SQL mentah tidak tersentuh extension Prisma.

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
