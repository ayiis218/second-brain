// Memeriksa dua aturan Fase 1 yang tidak bisa ditegakkan compiler:
//
//   1. prisma.entry.* hanya boleh dipanggil dari src/lib/entries/repository/
//      — inilah yang menjaga Entry.content selalu lewat validasi Zod.
//   2. startOfDay/endOfDay hanya boleh dipanggil dari src/lib/time.ts
//      — batas hari wajib dihitung dalam Asia/Jakarta, bukan UTC/lokal.
//
// Dijalankan tiap akhir fase, bukan sekali saja: keduanya bocor perlahan.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";

/**
 * Cocokkan path terhadap daftar izin.
 *
 * Entri yang diakhiri "/" berarti SELURUH isi folder itu, bukan satu berkas.
 * Dibutuhkan sejak repository dipecah per domain: aturannya memang berlaku
 * untuk modulnya sebagai satu kesatuan, bukan untuk satu nama berkas yang
 * kebetulan dipakai waktu aturan ini ditulis.
 */
function listed(paths, rel) {
  return paths.some((p) => (p.endsWith("/") ? rel.startsWith(p) : p === rel));
}

const GATES = [
  {
    name: "prisma.entry di luar repository",
    pattern: /\bprisma\.entry\b/,
    allow: [
      "src/lib/entries/repository/",
      "src/lib/entries/sync-repository.ts",
      // Retensi trash: hard-delete lintas-user, bukan tulis per-owner —
      // lihat komentar di berkasnya sendiri soal kenapa ini beda dari
      // sync-repository.ts.
      "src/lib/entries/trash-retention.ts",
    ],
    hint: "Pakai fungsi dari src/lib/entries/repository/ supaya content tervalidasi Zod.",
  },
  {
    name: "startOfDay/endOfDay di luar lib/time",
    pattern: /\b(startOfDay|endOfDay)\b/,
    allow: ["src/lib/time.ts"],
    hint: "Pakai dayRange()/dayKey() dari src/lib/time.ts agar batas hari tetap WIB.",
  },
  // --- Vault Legacy (Fase 5A) ---
  {
    name: "prisma.legacyItem di luar repository legacy",
    pattern: /\bprisma\.legacy[A-Za-z]*\b/,
    // access.ts & pin.ts ikut diizinkan: keduanya bagian dari gerbang
    // entitlement/PIN yang dipanggil repository.ts, dan sama-sama perlu
    // menyentuh tabel LegacyAccess secara langsung. trial-expiry.ts juga:
    // job sistem lintas-user, lihat komentarnya sendiri dan SYSTEM_PATHS
    // di bawah soal kenapa ini beda dari access.ts/pin.ts.
    allow: [
      "src/lib/legacy/repository.ts",
      "src/lib/legacy/access.ts",
      "src/lib/legacy/pin.ts",
      "src/lib/legacy/trial-expiry.ts",
      // Ringkasan funnel admin — lintas semua user, lihat komentar di
      // berkasnya sendiri.
      "src/lib/legacy/vault-funnel.ts",
    ],
    hint: "Vault hanya boleh diakses lewat src/lib/legacy/repository.ts, access.ts, pin.ts, trial-expiry.ts, atau vault-funnel.ts, yang memeriksa kepemilikan.",
  },
  {
    name: "master key dibaca di luar legacy/crypto",
    // Yang dilarang membaca nilainya, bukan menyebut namanya. Pesan bantuan
    // di UI justru perlu menyebut nama env var-nya supaya bisa ditindaklanjuti.
    pattern: /process\.env\.LEGACY_MASTER_KEY/,
    allow: ["src/lib/legacy/crypto.ts"],
    hint: "Master key hanya boleh disentuh src/lib/legacy/crypto.ts — satu tempat untuk diperiksa.",
  },
  {
    name: "isi legacy bocor ke jalur export biasa",
    pattern: /legacyItem|LegacyItem|legacyAttachment|LegacyAttachment/,
    allow: ["src/lib/legacy/repository.ts", "src/lib/legacy/actions.ts"],
    only: ["src/app/api/export/route.ts", "src/lib/entries/repository/"],
    hint: "Vault punya jalur export terenkripsi sendiri; jangan ikut di /api/export biasa.",
  },
  // --- Isolasi data multi-user (Fase 2.0) ---
  {
    name: "model ber-scope diakses tanpa lewat repository",
    pattern: /\bprisma\.(tag|entryTag|entryLink)\b/,
    allow: ["src/lib/entries/repository/", "src/lib/db.ts"],
    hint: "Model ber-scope user hanya boleh diakses lewat repository yang memakai scopedDb().",
  },
  {
    name: "prisma mentah di komponen atau halaman",
    pattern: /from ["']@\/lib\/prisma["']/,
    allow: [
      "src/lib/db.ts",
      "src/lib/entries/repository/",
      "src/lib/invites.ts",
      // Jalur SISTEM (cron), berjalan tanpa sesi. Aturannya diganti
      // aturan lain: setiap query di sana wajib menyebut ownerId —
      // diperiksa gerbang "jalur sistem tanpa ownerId" di bawah.
      "src/lib/entries/sync-repository.ts",
      "src/lib/sync/finance.ts",
      // Snapshot posisi: satu baris tunggal milik pemilik, bukan data
      // per-user, jadi tidak ada userId untuk disaring.
      "src/lib/sync/finance-snapshot.ts",
      // Memverifikasi identitas user justru harus di luar scoping —
      // yang diperiksa adalah keberadaan baris User itu sendiri.
      "src/lib/auth-user.ts",
      // Pencatatan perangkat berjalan di dalam event NextAuth, sebelum
      // ada sesi yang bisa dipakai scopedDb(). userId diterima
      // eksplisit dari adapter.
      "src/lib/security/devices.ts",
      "src/auth.ts",
      // Vault Legacy tidak memakai scopedDb() karena aturannya LEBIH
      // ketat, bukan lebih longgar: modul ini butuh entitlement, bukan
      // cuma sesi. Aturan penggantinya diperiksa gerbang "query tanpa
      // penyaring pemilik".
      "src/lib/legacy/repository.ts",
      "src/lib/legacy/access.ts",
      "src/lib/legacy/pin.ts",
      // Retensi trash & expiry trial berjalan tanpa sesi dan sengaja
      // lintas-user — tidak ada userId tunggal untuk disaring. Lihat
      // SYSTEM_PATHS di bawah: ketiganya SENGAJA tidak didaftarkan di sana.
      "src/lib/entries/trash-retention.ts",
      "src/lib/legacy/trial-expiry.ts",
      // Ringkasan funnel admin: PAKAI sesi (isOwner()), tapi querynya
      // sendiri sengaja lintas-user (data admin, bukan vault milik
      // pemanggil) — beda dari access.ts/pin.ts yang di SYSTEM_PATHS.
      "src/lib/legacy/vault-funnel.ts",
    ],
    hint: "Client Prisma mentah melewati penyaring userId. Pakai scopedDb() atau fungsi repository.",
  },
];

/**
 * Gerbang terpisah: setiap $queryRaw wajib menyebut userId.
 *
 * Raw SQL tidak tersentuh Prisma Client Extension di src/lib/db.ts, jadi
 * inilah satu-satunya tempat isolasi bergantung pada ketelitian menulis
 * query. Pemeriksaan tekstual memang kasar dan bisa ditipu, tapi menangkap
 * kasus yang paling mungkin terjadi: query baru yang ditulis buru-buru.
 */
const RAW_QUERY_GATE = {
  name: "$queryRaw tanpa filter userId",
  hint: "Tambahkan filter userId di query raw — extension Prisma tidak menjangkau SQL mentah.",
};

/**
 * Jalur SISTEM: berkas yang berjalan tanpa sesi (cron sync), sehingga
 * scopedDb() tidak bisa dipakai dan extension tidak menyuntik apa pun.
 * Sebagai gantinya, setiap query di sana wajib menyebut `ownerId`.
 */
/**
 * `src/lib/entries/trash-retention.ts` dan `src/lib/legacy/trial-expiry.ts`
 * SENGAJA tidak ada di sini.
 *
 * Aturan "setiap query wajib menyebut ownerId" dibuat untuk jalur sistem
 * yang menulis data MILIK SATU owner (sync finance). Retensi trash dan
 * expiry trial sebaliknya: kebijakan yang berlaku sama untuk SELURUH user
 * sekaligus, jadi query tanpa userId di sana bukan celah — itu memang
 * desainnya. Jangan tambahkan kedua berkas itu ke sini tanpa mengubah juga
 * apa yang query-nya lakukan.
 */
const SYSTEM_PATHS = [
  { path: "src/lib/entries/sync-repository.ts", token: "ownerId" },
  // Vault Legacy: requireOwner() mengembalikan userId, dan setiap query
  // wajib menyebutnya. Tanpa aturan ini, satu query baru yang lupa
  // menyertakannya membuka seluruh vault ke sesi mana pun.
  { path: "src/lib/legacy/repository.ts", token: "userId" },
  { path: "src/lib/legacy/access.ts", token: "userId" },
  { path: "src/lib/legacy/pin.ts", token: "userId" },
];
const SYSTEM_GATE = {
  name: "query tanpa penyaring pemilik",
  hint: "Query di jalur ini tidak di-scope otomatis — sertakan userId/ownerId secara eksplisit.",
};

// Baris komentar satu baris maupun baris di dalam komentar blok.
function isComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
let failed = false;

for (const gate of GATES) {
  const offenders = [];

  for (const file of files) {
    const rel = relative(".", file);
    if (listed(gate.allow, rel)) continue;
    // `only` membalik logikanya: alih-alih memindai semua berkas kecuali
    // yang diizinkan, ia hanya memindai daftar yang disebut.
    if (gate.only && !listed(gate.only, rel)) continue;

    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (isComment(line)) return; // aturannya dijelaskan di komentar; itu bukan pelanggaran
      if (gate.pattern.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
    });
  }

  if (offenders.length > 0) {
    failed = true;
    console.error(`\n✗ ${gate.name}`);
    for (const o of offenders) console.error(`    ${o}`);
    console.error(`  → ${gate.hint}`);
  } else {
    console.log(`✓ ${gate.name}`);
  }
}

// $queryRaw diperiksa per-blok, bukan per-baris: query raw hampir selalu
// membentang beberapa baris, sehingga filter userId-nya jarang berada di
// baris yang sama dengan pemanggilannya.
{
  const offenders = [];

  for (const file of files) {
    const rel = relative(".", file);
    const source = readFileSync(file, "utf8");

    const lineStarts = [];
    {
      let offset = 0;
      for (const line of source.split("\n")) {
        lineStarts.push(offset);
        offset += line.length + 1;
      }
    }
    const lineAt = (index) => {
      let lo = 0;
      let hi = lineStarts.length - 1;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (lineStarts[mid] <= index) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    };
    const sourceLines = source.split("\n");

    for (const match of source.matchAll(/\$queryRaw|\$executeRaw/g)) {
      const start = match.index ?? 0;

      // Komentar boleh — dan memang perlu — menyebut $queryRaw saat
      // menjelaskan aturannya. Yang diperiksa hanya pemanggilan sungguhan.
      if (isComment(sourceLines[lineAt(start)] ?? "")) continue;

      // Pindai seluruh template literal-nya, bukan sepotong tetap. Query
      // search membentang jauh lebih panjang dari jendela mana pun yang
      // masuk akal, dan filter userId-nya justru ada di bagian akhir.
      const open = source.indexOf("`", start);
      const close = open === -1 ? -1 : source.indexOf("`", open + 1);
      const block = close === -1 ? source.slice(start, start + 600) : source.slice(open, close);

      if (!/userId/.test(block)) {
        const line = source.slice(0, start).split("\n").length;
        offenders.push(`${rel}:${line}  ${match[0]} tanpa userId di dalam query-nya`);
      }
    }
  }

  if (offenders.length > 0) {
    failed = true;
    console.error(`\n✗ ${RAW_QUERY_GATE.name}`);
    for (const o of offenders) console.error(`    ${o}`);
    console.error(`  → ${RAW_QUERY_GATE.hint}`);
  } else {
    console.log(`✓ ${RAW_QUERY_GATE.name}`);
  }
}

// Jalur sistem: tiap pemanggilan Prisma harus menyebut ownerId di dekatnya.
{
  const offenders = [];

  for (const { path: rel, token } of SYSTEM_PATHS) {
    let source;
    try {
      source = readFileSync(rel, "utf8");
    } catch {
      continue; // berkasnya belum ada; bukan pelanggaran
    }

    const lines = source.split("\n");
    for (const match of source.matchAll(/\bprisma\.[a-zA-Z]+\.[a-zA-Z]+\(/g)) {
      const start = match.index ?? 0;
      const lineNo = source.slice(0, start).split("\n").length;
      if (isComment(lines[lineNo - 1] ?? "")) continue;

      // Batas argumen dicari lewat kurung berpasangan, bukan jendela tetap:
      // jendela tetap ikut membaca pemanggilan tetangga, sehingga ownerId
      // milik query lain membuat query yang bolong ini lolos.
      const open = start + match[0].length - 1;
      let depth = 0;
      let close = open;
      for (let i = open; i < source.length; i++) {
        if (source[i] === "(") depth++;
        else if (source[i] === ")") {
          depth--;
          if (depth === 0) {
            close = i;
            break;
          }
        }
      }

      if (!new RegExp(token).test(source.slice(open, close))) {
        // Jalan keluar sempit: sebagian tabel (mis. LegacyAttachment) tidak
        // punya kolom ownerId/userId sendiri sama sekali — kepemilikannya
        // menumpang relasi ke tabel lain, dan itu sudah diverifikasi
        // beberapa baris sebelumnya, bukan di dalam argumen panggilan ini.
        // Untuk kasus itu, buktinya boleh ditulis di komentar TEPAT di atas
        // panggilan (baris komentar berurutan, tanpa baris kosong di antara)
        // alih-alih dipaksakan masuk ke argumen yang memang tidak punya
        // tempat untuknya. Ini bukan jalan pintas melewati gerbang — bukti
        // tertulisnya tetap wajib ada dan tetap diperiksa reviewer, hanya
        // lokasinya yang berpindah.
        let precedingComment = "";
        for (let i = lineNo - 2; i >= 0 && isComment(lines[i]); i--) {
          precedingComment = `${lines[i]}\n${precedingComment}`;
        }

        if (!new RegExp(token).test(precedingComment)) {
          offenders.push(
            `${rel}:${lineNo}  ${match[0]}…) tanpa ${token} di argumennya atau di komentar tepat di atasnya`,
          );
        }
      }
    }
  }

  if (offenders.length > 0) {
    failed = true;
    console.error(`\n✗ ${SYSTEM_GATE.name}`);
    for (const o of offenders) console.error(`    ${o}`);
    console.error(`  → ${SYSTEM_GATE.hint}`);
  } else {
    console.log(`✓ ${SYSTEM_GATE.name}`);
  }
}

/**
 * Setiap ekspor top-level di berkas `"use server"` wajib async function.
 *
 * Next.js menegakkan ini di RUNTIME ("A 'use server' file can only export
 * async functions, found ..."), BUKAN saat `npm run typecheck`/`lint`/
 * `build` — ketiganya lolos bersih walau pelanggarannya ada, dan baru
 * ketahuan saat modulnya benar-benar dimuat request pertama. Satu konstanta
 * angka yang lolos ke sini pernah mematahkan SELURUH action di satu berkas
 * (bukan cuma satu fungsi), dengan gejala yang jauh dari penyebabnya
 * (React error #441 generik di produksi). Gerbang ini menangkapnya sebelum
 * commit, bukan setelah dilaporkan.
 */
{
  const offenders = [];
  const USE_SERVER_RE = /^["']use server["'];?\s*$/;
  const ALLOWED_EXPORT_RE = /^export\s+(default\s+)?async\s+function\b/;
  const ALLOWED_CONST_RE = /^export\s+const\s+\w+\s*=\s*async\b/;
  const TYPE_ONLY_RE = /^export\s+(type|interface)\b/;

  for (const file of files) {
    const rel = relative(".", file);
    const lines = readFileSync(file, "utf8").split("\n");

    const firstCode = lines.find((l) => l.trim().length > 0);
    if (!firstCode || !USE_SERVER_RE.test(firstCode.trim())) continue;

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("export ")) return;
      if (TYPE_ONLY_RE.test(trimmed)) return;
      if (ALLOWED_EXPORT_RE.test(trimmed) || ALLOWED_CONST_RE.test(trimmed)) return;

      offenders.push(`${rel}:${i + 1}  ${trimmed.slice(0, 70)}`);
    });
  }

  if (offenders.length > 0) {
    failed = true;
    console.error(`\n✗ ekspor non-async-function di berkas "use server"`);
    for (const o of offenders) console.error(`    ${o}`);
    console.error(
      `  → Pindahkan konstanta/tipe ini ke berkas lain (mis. schemas.ts) — "use server" hanya boleh mengekspor async function.`,
    );
  } else {
    console.log(`✓ ekspor non-async-function di berkas "use server"`);
  }
}

/**
 * `page.tsx` dan `route.ts` wajib eksplisit soal dynamic/runtime —
 * bukan mengandalkan Next menyimpulkannya diam-diam dari pemakaian
 * `searchParams`/default runtime.
 *
 * Ini bukan dugaan: ditemukan DUA pelanggaran nyata saat gerbang ini
 * ditulis (login/page.tsx tanpa `dynamic`, legacy/attachments/[id]/route.ts
 * tanpa `runtime`) — keduanya kebetulan tidak berdampak SEKARANG karena
 * Next menyimpulkannya dari hal lain di sekitarnya. "Kebetulan tidak
 * berdampak karena perilaku implisit" persis pola yang melahirkan insiden
 * ekspor `"use server"` di atas: aman sampai sesuatu di sekitarnya berubah
 * dan perilaku implisitnya ikut hilang tanpa peringatan.
 */
{
  const offenders = [];

  const PAGE_SCOPE_RE = /^src\/app\/\(app\)\/|^src\/app\/vault\/page\.tsx$|^src\/app\/login\/page\.tsx$|^src\/app\/invite\//;

  for (const file of files) {
    const rel = relative(".", file);
    const base = rel.split("/").pop();
    const isPage = base === "page.tsx" && PAGE_SCOPE_RE.test(rel);
    const isRoute = base === "route.ts";
    if (!isPage && !isRoute) continue;

    const source = readFileSync(file, "utf8");
    if (!/^export const dynamic\s*=/m.test(source)) {
      offenders.push(`${rel}  tanpa "export const dynamic"`);
    }
    if (isRoute && !/^export const runtime\s*=/m.test(source)) {
      offenders.push(`${rel}  tanpa "export const runtime"`);
    }
  }

  if (offenders.length > 0) {
    failed = true;
    console.error(`\n✗ dynamic/runtime tidak eksplisit di page.tsx atau route.ts`);
    for (const o of offenders) console.error(`    ${o}`);
    console.error(
      `  → Tambahkan "export const dynamic = ...", dan untuk route.ts juga "export const runtime = ..." — jangan andalkan Next menyimpulkannya diam-diam.`,
    );
  } else {
    console.log(`✓ dynamic/runtime tidak eksplisit di page.tsx atau route.ts`);
  }
}

if (failed) {
  console.error(
    "\nGerbang bocor. Aturan-aturan ini dijelaskan di README bagian " +
      "\"Aturan yang ditegakkan\".",
  );
  process.exit(1);
}

console.log("\nSemua gerbang aman.");
