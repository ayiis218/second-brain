// Memeriksa dua aturan Fase 1 yang tidak bisa ditegakkan compiler:
//
//   1. prisma.entry.* hanya boleh dipanggil dari src/lib/entries/repository.ts
//      — inilah yang menjaga Entry.content selalu lewat validasi Zod.
//   2. startOfDay/endOfDay hanya boleh dipanggil dari src/lib/time.ts
//      — batas hari wajib dihitung dalam Asia/Jakarta, bukan UTC/lokal.
//
// Dijalankan tiap akhir fase, bukan sekali saja: keduanya bocor perlahan.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";

const GATES = [
  {
    name: "prisma.entry di luar repository",
    pattern: /\bprisma\.entry\b/,
    allow: ["src/lib/entries/repository.ts"],
    hint: "Pakai fungsi dari src/lib/entries/repository.ts supaya content tervalidasi Zod.",
  },
  {
    name: "startOfDay/endOfDay di luar lib/time",
    pattern: /\b(startOfDay|endOfDay)\b/,
    allow: ["src/lib/time.ts"],
    hint: "Pakai dayRange()/dayKey() dari src/lib/time.ts agar batas hari tetap WIB.",
  },
  // --- Isolasi data multi-user (Fase 2.0) ---
  {
    name: "model ber-scope diakses tanpa lewat repository",
    pattern: /\bprisma\.(tag|entryTag|entryLink)\b/,
    allow: ["src/lib/entries/repository.ts", "src/lib/db.ts"],
    hint: "Model ber-scope user hanya boleh diakses lewat repository yang memakai scopedDb().",
  },
  {
    name: "prisma mentah di komponen atau halaman",
    pattern: /from ["']@\/lib\/prisma["']/,
    allow: [
      "src/lib/db.ts",
      "src/lib/entries/repository.ts",
      "src/lib/invites.ts",
      // Memverifikasi identitas user justru harus di luar scoping —
      // yang diperiksa adalah keberadaan baris User itu sendiri.
      "src/lib/auth-user.ts",
      "src/auth.ts",
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
    if (gate.allow.includes(rel)) continue;

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

if (failed) {
  console.error(
    "\nGerbang bocor. Lihat rencana-fase-1-second-brain.md §5(e)(f) dan " +
      "rencana-fase-2-second-brain.md §2.0(d).",
  );
  process.exit(1);
}

console.log("\nSemua gerbang aman.");
