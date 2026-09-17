// Uji pulang-pergi export -> import (rencana-fase-2-second-brain.md §2.7 DoD).
//
// "Backup yang belum pernah dipulihkan bukan backup" — jadi ini menjalankan
// pemulihan sungguhan, bukan sekadar memeriksa berkasnya terbentuk.
//
// Usage: npm run db:verify:export
import { neon } from "@neondatabase/serverless";
import { importPayload } from "./import.mjs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const SRC = "verify3-src";
const DST = "verify3-dst";

let failures = 0;
const check = (name, passed, detail = "") => {
  console.log(`${passed ? "✓" : "✗"} ${name}${detail ? `  — ${detail}` : ""}`);
  if (!passed) failures++;
};

const cleanup = () => sql.query(`DELETE FROM "User" WHERE id IN ($1, $2)`, [SRC, DST]);
await cleanup();

await sql.query(`INSERT INTO "User" (id, email) VALUES ($1, $2), ($3, $4)`, [
  SRC, "verify3-src@example.test", DST, "verify3-dst@example.test",
]);

// --- data sumber, termasuk tag dan tautan antar-entry ---
await sql.query(
  `INSERT INTO "Tag" (id, "userId", name, label) VALUES ('v3-tag', $1, 'ternak', 'Ternak')`,
  [SRC],
);
await sql.query(
  `INSERT INTO "Entry" (id, "userId", type, title, content, "occurredAt") VALUES
     ('v3-e1', $1, 'note', 'Kambing', '{"body":"beternak kambing"}', now()),
     ('v3-e2', $1, 'journal', 'Hari baik', '{"body":"lari pagi","mood":4}', now()),
     ('v3-e3', $1, 'task', 'Bayar listrik',
       '{"body":"","status":"todo","priority":"high","dueAt":null}', now())`,
  [SRC],
);
await sql.query(`INSERT INTO "EntryTag" ("entryId","tagId") VALUES ('v3-e1','v3-tag')`);
await sql.query(
  `INSERT INTO "EntryLink" (id, "userId", "fromId", "toId", kind)
   VALUES ('v3-l1', $1, 'v3-e1', 'v3-e2', 'related')`,
  [SRC],
);

// --- bentuk payload yang SAMA dengan /api/export?format=json ---
const entries = await sql.query(
  `SELECT e.id, e.type, e.title, e.content, e."occurredAt", e."createdAt",
          e."deletedAt", e.source, e."sourceId",
          coalesce(
            (SELECT json_agg(json_build_object('tag', json_build_object('name', t.name, 'label', t.label)))
               FROM "EntryTag" et JOIN "Tag" t ON t.id = et."tagId"
              WHERE et."entryId" = e.id), '[]'::json) AS tags
     FROM "Entry" e
    WHERE e."userId" = $1 AND e."deletedAt" IS NULL
    ORDER BY e."occurredAt"`,
  [SRC],
);
const tags = await sql.query(`SELECT id, name, label FROM "Tag" WHERE "userId" = $1`, [SRC]);
const links = await sql.query(
  `SELECT id, "fromId", "toId", kind FROM "EntryLink" WHERE "userId" = $1`,
  [SRC],
);

const payload = { exportedAt: new Date().toISOString(), version: 1, entries, tags, links };

check("export memuat semua entry", payload.entries.length === 3, `${payload.entries.length}`);
check("export memuat tag dan tautan", payload.tags.length === 1 && payload.links.length === 1);

// --- import ke akun yang benar-benar kosong ---
const result = await importPayload(sql, DST, payload);

const dstEntries = await sql.query(
  `SELECT id, type, title, content FROM "Entry" WHERE "userId" = $1 ORDER BY "occurredAt"`,
  [DST],
);
check(
  "jumlah entry setelah import sama dengan sumber",
  dstEntries.length === payload.entries.length,
  `${dstEntries.length} vs ${payload.entries.length}`,
);

check(
  "isi entry ikut terbawa utuh",
  dstEntries.some((e) => e.title === "Kambing" && e.content?.body === "beternak kambing"),
);
check(
  "field bertipe (mood) ikut terbawa",
  dstEntries.some((e) => e.type === "journal" && e.content?.mood === 4),
);

const dstIds = new Set(dstEntries.map((e) => e.id));
check(
  "id dibuat ulang, tidak menabrak id sumber",
  !dstIds.has("v3-e1") && result.entriesCreated === 3,
);

const dstTagged = await sql.query(
  `SELECT t.label FROM "EntryTag" et
     JOIN "Tag" t ON t.id = et."tagId"
     JOIN "Entry" e ON e.id = et."entryId"
    WHERE e."userId" = $1`,
  [DST],
);
check("tag ikut dipulihkan dan tertaut", dstTagged.length === 1 && dstTagged[0].label === "Ternak");

const dstLinks = await sql.query(
  `SELECT l."fromId", l."toId" FROM "EntryLink" l WHERE l."userId" = $1`,
  [DST],
);
check(
  "tautan antar-entry dipetakan ke id baru, bukan id lama",
  dstLinks.length === 1 && dstIds.has(dstLinks[0].fromId) && dstIds.has(dstLinks[0].toId),
);

// --- import kedua kali tidak boleh menabrak ---
const second = await importPayload(sql, DST, payload);
check("import berulang tidak gagal karena tabrakan id", second.entriesCreated === 3);

const srcAfter = await sql.query(
  `SELECT count(*)::int AS n FROM "Entry" WHERE "userId" = $1`,
  [SRC],
);
check("data akun sumber tidak tersentuh oleh import", srcAfter[0].n === 3);

await cleanup();
console.log(failures === 0 ? "\nExport/import aman." : `\n${failures} pemeriksaan GAGAL.`);
process.exit(failures === 0 ? 0 : 1);
