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
];

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

if (failed) {
  console.error("\nGerbang Fase 1 bocor. Lihat rencana-fase-1-second-brain.md §5(e)(f).");
  process.exit(1);
}

console.log("\nSemua gerbang aman.");
