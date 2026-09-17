// Verifikasi isolasi data multi-user (rencana-fase-2-second-brain.md §2.0 DoD).
//
// Menguji langsung di database dengan dua user sungguhan, lalu membersihkan
// dirinya sendiri. Yang diperiksa:
//   1. Constraint unik tag kini per-user (dulu global)
//   2. Constraint idempotensi sync kini per-user
//   3. Query ber-filter userId tidak pernah mengembalikan baris user lain
//   4. Full-text search — jalur $queryRaw yang tidak terlindungi extension
//   5. Hapus user menghapus seluruh datanya lewat cascade
//
// Usage: npm run db:verify:isolation
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const A = "verify-user-a";
const B = "verify-user-b";

let failures = 0;

function check(name, passed, detail = "") {
  console.log(`${passed ? "✓" : "✗"} ${name}${detail ? `  — ${detail}` : ""}`);
  if (!passed) failures++;
}

async function cleanup() {
  await sql.query(`DELETE FROM "User" WHERE id IN ($1, $2)`, [A, B]);
}

await cleanup();

// --- siapkan dua user + satu entry masing-masing ---------------------------
await sql.query(
  `INSERT INTO "User" (id, email) VALUES ($1, $2), ($3, $4)`,
  [A, "verify-a@example.test", B, "verify-b@example.test"],
);

await sql.query(
  `INSERT INTO "Entry" (id, "userId", type, title, content, "occurredAt")
   VALUES ('verify-e-a', $1, 'note', 'Rahasia A', '{"body":"kata rahasia milik A"}', now()),
          ('verify-e-b', $2, 'note', 'Catatan B', '{"body":"catatan biasa milik B"}', now())`,
  [A, B],
);

// --- 1. Tag: nama sama, dua user berbeda -----------------------------------
try {
  await sql.query(
    `INSERT INTO "Tag" (id, "userId", name, label)
     VALUES ('verify-t-a', $1, 'kerja', 'Kerja'), ('verify-t-b', $2, 'kerja', 'kerja')`,
    [A, B],
  );
  check("dua user boleh punya tag bernama sama", true);
} catch (error) {
  check("dua user boleh punya tag bernama sama", false, error.message);
}

// tapi user yang sama tetap tidak boleh duplikat
try {
  await sql.query(
    `INSERT INTO "Tag" (id, "userId", name, label) VALUES ('verify-t-a2', $1, 'kerja', 'Kerja')`,
    [A],
  );
  check("tag duplikat dalam satu user ditolak", false, "insert malah berhasil");
} catch {
  check("tag duplikat dalam satu user ditolak", true);
}

// --- 2. Idempotensi sync kini per-user -------------------------------------
try {
  await sql.query(
    `INSERT INTO "Entry" (id, "userId", type, content, "occurredAt", source, "sourceId")
     VALUES ('verify-s-a', $1, 'note', '{"body":"a"}', now(), 'FINANCE', 'TX1'),
            ('verify-s-b', $2, 'note', '{"body":"b"}', now(), 'FINANCE', 'TX1')`,
    [A, B],
  );
  check("sourceId sama boleh dipakai dua user berbeda", true);
} catch (error) {
  check("sourceId sama boleh dipakai dua user berbeda", false, error.message);
}

try {
  await sql.query(
    `INSERT INTO "Entry" (id, "userId", type, content, "occurredAt", source, "sourceId")
     VALUES ('verify-s-a2', $1, 'note', '{"body":"a"}', now(), 'FINANCE', 'TX1')`,
    [A],
  );
  check("sourceId duplikat dalam satu user ditolak", false, "insert malah berhasil");
} catch {
  check("sourceId duplikat dalam satu user ditolak", true);
}

// --- 3. Query ber-scope tidak bocor ----------------------------------------
const rowsForB = await sql.query(
  `SELECT id FROM "Entry" WHERE "userId" = $1 AND "deletedAt" IS NULL`,
  [B],
);
check(
  "daftar entry milik B tidak memuat entry milik A",
  rowsForB.every((r) => r.id !== "verify-e-a"),
  `${rowsForB.length} baris`,
);

// --- 4. Search: jalur $queryRaw --------------------------------------------
// Kata "rahasia" hanya ada di entry milik A. Query ber-filter userId=B
// harus mengembalikan nol baris; kalau tidak, search membocorkan data.
const searchAsB = await sql.query(
  `SELECT id FROM "Entry"
    WHERE "userId" = $1 AND "searchVector" @@ websearch_to_tsquery('simple', 'rahasia')`,
  [B],
);
check("search milik B tidak menemukan entry milik A", searchAsB.length === 0);

const searchAsA = await sql.query(
  `SELECT id FROM "Entry"
    WHERE "userId" = $1 AND "searchVector" @@ websearch_to_tsquery('simple', 'rahasia')`,
  [A],
);
check("search milik A menemukan entry-nya sendiri", searchAsA.length === 1);

// --- 5. Cascade hapus akun -------------------------------------------------
await sql.query(`DELETE FROM "User" WHERE id = $1`, [B]);

const leftoverB = await sql.query(
  `SELECT (SELECT count(*) FROM "Entry" WHERE "userId" = $1)::int AS entries,
          (SELECT count(*) FROM "Tag"   WHERE "userId" = $1)::int AS tags`,
  [B],
);
check(
  "hapus user B menghapus seluruh datanya",
  leftoverB[0].entries === 0 && leftoverB[0].tags === 0,
  JSON.stringify(leftoverB[0]),
);

const survivingA = await sql.query(
  `SELECT count(*)::int AS entries FROM "Entry" WHERE "userId" = $1`,
  [A],
);
check("data user A tetap utuh setelah B dihapus", survivingA[0].entries > 0);

await cleanup();

console.log(failures === 0 ? "\nIsolasi aman." : `\n${failures} pemeriksaan GAGAL.`);
process.exit(failures === 0 ? 0 : 1);
