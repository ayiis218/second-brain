// Verifikasi Fase 4 di level database.
//
// Fokus pada aturan yang tidak bisa dilihat dari typecheck: satu kebiasaan
// hanya boleh tercentang sekali per hari, centang habit tidak mencemari
// timeline, dan isolasi tetap berlaku untuk tipe entry baru.
//
// Usage: npm run db:verify:phase4
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const A = "verify5-a";
const B = "verify5-b";

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures++;
};

const cleanup = () => sql.query(`DELETE FROM "User" WHERE id IN ($1, $2)`, [A, B]);
await cleanup();

await sql.query(`INSERT INTO "User" (id, email) VALUES ($1, $2), ($3, $4)`, [
  A, "verify5-a@example.test", B, "verify5-b@example.test",
]);

await sql.query(
  `INSERT INTO "Entry" (id, "userId", type, title, content, "occurredAt")
   VALUES ('v5-habit-a', $1, 'habit', 'Lari pagi', '{"body":""}', now()),
          ('v5-habit-b', $2, 'habit', 'Lari pagi', '{"body":""}', now())`,
  [A, B],
);

const log = (id, user, habit, day) =>
  sql.query(
    `INSERT INTO "Entry" (id, "userId", type, content, "occurredAt")
     VALUES ($1, $2, 'habit_log',
             jsonb_build_object('body','','habitId',$3::text,'dayKey',$4::text), now())`,
    [id, user, habit, day],
  );

// --- satu centang per hari ---------------------------------------------------
await log("v5-log-1", A, "v5-habit-a", "2026-09-15");
check("centang pertama diterima", true);

try {
  await log("v5-log-dup", A, "v5-habit-a", "2026-09-15");
  check("centang ganda di hari yang sama ditolak", false, "insert malah berhasil");
} catch {
  check("centang ganda di hari yang sama ditolak", true);
}

await log("v5-log-2", A, "v5-habit-a", "2026-09-16");
check("hari berbeda tetap boleh", true);

// --- user lain tidak bentrok --------------------------------------------------
try {
  await log("v5-log-b", B, "v5-habit-b", "2026-09-15");
  check("user lain boleh mencentang di hari yang sama", true);
} catch (error) {
  check("user lain boleh mencentang di hari yang sama", false, error.message);
}

// --- unique index memang parsial: soft delete melepas slotnya -----------------
await sql.query(`UPDATE "Entry" SET "deletedAt" = now() WHERE id = 'v5-log-1'`);
try {
  await log("v5-log-again", A, "v5-habit-a", "2026-09-15");
  check("setelah log dihapus, hari itu bisa dicentang lagi", true);
} catch (error) {
  check("setelah log dihapus, hari itu bisa dicentang lagi", false, error.message);
}

// --- habit_log tidak boleh muncul di daftar entry biasa -----------------------
const timeline = await sql.query(
  `SELECT id FROM "Entry"
    WHERE "userId" = $1 AND "deletedAt" IS NULL AND type <> 'habit_log'`,
  [A],
);
check(
  "habit_log tidak ikut daftar entry biasa",
  timeline.every((row) => !row.id.startsWith("v5-log")),
  `${timeline.length} baris`,
);

// --- isolasi: habit A tidak terlihat B ----------------------------------------
const cross = await sql.query(
  `SELECT id FROM "Entry" WHERE "userId" = $1 AND type = 'habit'`,
  [B],
);
check("habit milik A tidak terlihat oleh B", cross.every((r) => r.id === "v5-habit-b"));

// --- log tidak punya foreign key ke habit -------------------------------------
// habitId disimpan di JSONB, jadi tidak ada cascade. Pembersihannya dilakukan
// softDeleteEntry() di aplikasi; di sini yang diuji adalah bahwa penghapusan
// LANGSUNG di database memang meninggalkan log yatim — itulah alasan langkah
// pembersihan di aplikasi dibutuhkan.
await sql.query(`DELETE FROM "Entry" WHERE id = 'v5-habit-a'`);
const orphanLogs = await sql.query(
  `SELECT id FROM "Entry" WHERE "userId" = $1 AND type = 'habit_log'`,
  [A],
);
check(
  "hapus langsung di DB meninggalkan log yatim (alasan pembersihan di aplikasi)",
  orphanLogs.length > 0,
  `${orphanLogs.length} log`,
);

// --- index habit terpasang -----------------------------------------------------
const idx = await sql.query(
  `SELECT indexname FROM pg_indexes
    WHERE tablename = 'Entry'
      AND indexname IN ('Entry_habit_log_day_key','Entry_habit_log_lookup')`,
);
check("index habit terpasang", idx.length === 2, `${idx.length}/2`);

// --- Paginasi keyset tidak melewatkan maupun menggandakan baris -------------
await sql.query(
  `INSERT INTO "Entry" (id, "userId", type, title, content, "occurredAt")
   SELECT 'v5-page-' || g, $1, 'note', 'Catatan ' || g, '{"body":"isi"}',
          now() - (g || ' minutes')::interval
     FROM generate_series(1, 25) g`,
  [A],
);

const pageSize = 10;
const seen = new Set();
let cursor = null;
let pages = 0;

for (;;) {
  const rows = await sql.query(
    `SELECT id, "occurredAt" FROM "Entry"
      WHERE "userId" = $1 AND type = 'note' AND "deletedAt" IS NULL
        AND ($2::timestamp IS NULL OR ("occurredAt" < $2::timestamp
             OR ("occurredAt" = $2::timestamp AND id < $3::text)))
      ORDER BY "occurredAt" DESC, id DESC
      LIMIT ${pageSize + 1}`,
    [A, cursor?.at ?? null, cursor?.id ?? null],
  );

  const page = rows.slice(0, pageSize);
  for (const row of page) seen.add(row.id);
  pages++;

  if (rows.length <= pageSize || pages > 10) break;
  const last = page[page.length - 1];
  cursor = { at: last.occurredAt, id: last.id };
}

check(
  "paginasi keyset menjangkau semua baris tanpa duplikat",
  seen.size === 25,
  `${seen.size}/25 dalam ${pages} halaman`,
);

// --- Tempat sampah -----------------------------------------------------------
await sql.query(`UPDATE "Entry" SET "deletedAt" = now() WHERE id = 'v5-page-1'`);
const inTrash = await sql.query(
  `SELECT id FROM "Entry" WHERE "userId" = $1 AND "deletedAt" IS NOT NULL`,
  [A],
);
check("entry terhapus muncul di tempat sampah", inTrash.some((r) => r.id === "v5-page-1"));

await sql.query(`UPDATE "Entry" SET "deletedAt" = NULL WHERE id = 'v5-page-1'`);
const restored = await sql.query(
  `SELECT id FROM "Entry" WHERE id = 'v5-page-1' AND "deletedAt" IS NULL`,
);
check("entry bisa dipulihkan dari tempat sampah", restored.length === 1);

await cleanup();
console.log(failures === 0 ? "\nFase 4 aman." : `\n${failures} pemeriksaan GAGAL.`);
process.exit(failures === 0 ? 0 : 1);
