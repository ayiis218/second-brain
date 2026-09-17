// Verifikasi Fase 2 di level database (rencana-fase-2-second-brain.md).
//
// Menguji perilaku yang tidak bisa dilihat dari typecheck: search prefix,
// isolasi search antar-user, expression index task benar-benar terpakai,
// dan relasi tag. Membersihkan dirinya sendiri.
//
// Usage: npm run db:verify:phase2
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const A = "verify2-user-a";
const B = "verify2-user-b";

let failures = 0;
const check = (name, passed, detail = "") => {
  console.log(`${passed ? "✓" : "✗"} ${name}${detail ? `  — ${detail}` : ""}`);
  if (!passed) failures++;
};

const cleanup = () => sql.query(`DELETE FROM "User" WHERE id IN ($1, $2)`, [A, B]);
await cleanup();

await sql.query(`INSERT INTO "User" (id, email) VALUES ($1, $2), ($3, $4)`, [
  A, "verify2-a@example.test", B, "verify2-b@example.test",
]);

await sql.query(
  `INSERT INTO "Entry" (id, "userId", type, title, content, "occurredAt") VALUES
     ('v2-note-a', $1, 'note', 'Rencana kambing', '{"body":"beternak kambing etawa"}', now()),
     ('v2-jour-a', $1, 'journal', 'Hari baik', '{"body":"lari pagi","mood":4}', now()),
     ('v2-task-a', $1, 'task', 'Bayar listrik',
       '{"body":"","status":"todo","priority":"high","dueAt":"2026-09-10T00:00:00.000Z"}', now()),
     ('v2-task-a2', $1, 'task', 'Sudah beres',
       '{"body":"","status":"done","priority":"low","dueAt":null}', now()),
     ('v2-note-b', $2, 'note', 'Catatan B', '{"body":"tidak ada kambing di sini"}', now())`,
  [A, B],
);

// --- Search: pencocokan awalan ---------------------------------------------
const prefixHit = await sql.query(
  `SELECT id FROM "Entry"
    WHERE "userId" = $1
      AND "searchVector" @@ (websearch_to_tsquery('simple','kambi') || to_tsquery('simple','kambi:*'))`,
  [A],
);
check(
  "mengetik sebagian kata ('kambi') menemukan 'kambing'",
  prefixHit.some((r) => r.id === "v2-note-a"),
);

const exactOnly = await sql.query(
  `SELECT id FROM "Entry"
    WHERE "userId" = $1 AND "searchVector" @@ websearch_to_tsquery('simple','kambi')`,
  [A],
);
check(
  "tanpa awalan, 'kambi' TIDAK menemukan apa pun (alasan prefix dibutuhkan)",
  exactOnly.length === 0,
);

// --- Search: isolasi antar-user --------------------------------------------
const crossUser = await sql.query(
  `SELECT id FROM "Entry"
    WHERE "userId" = $1
      AND "searchVector" @@ (websearch_to_tsquery('simple','kambing') || to_tsquery('simple','kambing:*'))`,
  [B],
);
check(
  "search milik B hanya menemukan entry B, bukan A",
  crossUser.every((r) => r.id.endsWith("-b")),
  `${crossUser.length} baris`,
);

// --- Search: multi-kata TIDAK boleh longgar --------------------------------
// Regresi yang pernah lolos: menggabungkan query utama dengan awalan memakai
// OR membuat semua kata kecuali yang terakhir diabaikan.
const looseCheck = await sql.query(
  `SELECT count(*)::int AS n FROM "Entry"
    WHERE "userId" = $1 AND "searchVector" @@ to_tsquery('simple','zzzz & kambing:*')`,
  [A],
);
check(
  "kata yang tidak ada membatalkan hasil (bukan diabaikan)",
  looseCheck[0].n === 0,
  `${looseCheck[0].n} baris`,
);

const bothWords = await sql.query(
  `SELECT count(*)::int AS n FROM "Entry"
    WHERE "userId" = $1 AND "searchVector" @@ to_tsquery('simple','beternak & kambing:*')`,
  [A],
);
check("dua kata yang sama-sama ada tetap ketemu", bothWords[0].n === 1);

// --- Search: ranking dan headline ------------------------------------------
const ranked = await sql.query(
  `SELECT id, ts_rank("searchVector", websearch_to_tsquery('simple','kambing')) AS rank,
          ts_headline('simple', coalesce(title,'') || ' — ' || coalesce(content->>'body',''),
                      websearch_to_tsquery('simple','kambing'),
                      'StartSel=<mark>, StopSel=</mark>') AS headline
     FROM "Entry"
    WHERE "userId" = $1 AND "searchVector" @@ websearch_to_tsquery('simple','kambing')`,
  [A],
);
check("hasil search punya rank > 0", ranked.length > 0 && Number(ranked[0].rank) > 0);
check("headline menyorot kata yang cocok", ranked[0]?.headline?.includes("<mark>"));

// --- Task: expression index ada dan dipakai saat datanya banyak ------------
const indexes = await sql.query(
  `SELECT indexname FROM pg_indexes
    WHERE tablename = 'Entry' AND indexname IN ('Entry_task_status_idx','Entry_task_dueAt_idx')`,
);
check("expression index task terpasang", indexes.length === 2, `${indexes.length}/2`);

// Pada tabel berisi segelintir baris, seq scan JUSTRU pilihan planner yang
// benar — index scan malah lebih mahal. Jadi indexnya diuji pada volume yang
// membuat planner punya alasan memakainya.
await sql.query(
  `INSERT INTO "Entry" (id, "userId", type, content, "occurredAt")
   SELECT 'v2-bulk-' || g, $1, 'task',
          jsonb_build_object('body', '', 'status',
            CASE WHEN g % 10 = 0 THEN 'done' ELSE 'todo' END,
            'priority', 'medium', 'dueAt', NULL),
          now()
     FROM generate_series(1, 3000) g`,
  [A],
);
await sql.query(`ANALYZE "Entry"`);

const plan = await sql.query(
  `EXPLAIN SELECT id FROM "Entry"
    WHERE "userId" = $1 AND type = 'task' AND "deletedAt" IS NULL
      AND content->>'status' = 'done'`,
  [A],
);
const planText = plan.map((r) => Object.values(r)[0]).join("\n");
check(
  "pada 3000 task, planner memakai index (bukan seq scan)",
  /Index|Bitmap/i.test(planText),
  planText.split("\n")[0]?.trim(),
);

await sql.query(`DELETE FROM "Entry" WHERE id LIKE 'v2-bulk-%'`);

// --- Task: filter status ---------------------------------------------------
const openTasks = await sql.query(
  `SELECT id FROM "Entry"
    WHERE "userId" = $1 AND type = 'task' AND "deletedAt" IS NULL
      AND content->>'status' <> 'done'`,
  [A],
);
check(
  "task selesai tidak ikut daftar aktif",
  openTasks.length === 1 && openTasks[0].id === "v2-task-a",
);

// --- Tag: relasi dan cascade ------------------------------------------------
await sql.query(
  `INSERT INTO "Tag" (id, "userId", name, label) VALUES ('v2-tag-a', $1, 'ternak', 'Ternak')`,
  [A],
);
await sql.query(
  `INSERT INTO "EntryTag" ("entryId", "tagId") VALUES ('v2-note-a', 'v2-tag-a')`,
);
const tagged = await sql.query(
  `SELECT e.id FROM "Entry" e
     JOIN "EntryTag" et ON et."entryId" = e.id
    WHERE et."tagId" = 'v2-tag-a' AND e."userId" = $1`,
  [A],
);
check("entry bisa ditautkan ke tag", tagged.length === 1);

await sql.query(`DELETE FROM "Tag" WHERE id = 'v2-tag-a'`);
const afterTagDelete = await sql.query(`SELECT id FROM "Entry" WHERE id = 'v2-note-a'`);
check("menghapus tag tidak menghapus entry-nya", afterTagDelete.length === 1);

// --- Soft delete ------------------------------------------------------------
await sql.query(`UPDATE "Entry" SET "deletedAt" = now() WHERE id = 'v2-note-a'`);
const afterSoftDelete = await sql.query(
  `SELECT id FROM "Entry" WHERE "userId" = $1 AND "deletedAt" IS NULL`,
  [A],
);
check(
  "entry terhapus lunak hilang dari daftar aktif",
  !afterSoftDelete.some((r) => r.id === "v2-note-a"),
);

await cleanup();
console.log(failures === 0 ? "\nFase 2 aman." : `\n${failures} pemeriksaan GAGAL.`);
process.exit(failures === 0 ? 0 : 1);
