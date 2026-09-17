// Memulihkan hasil export (/api/export?format=json) ke sebuah akun.
//
// Pasangan dari export. Ada karena backup yang belum pernah dipulihkan
// bukan backup — lihat rencana-aplikasi-second-brain.md §11.3.
//
// Id entry dibuat ULANG, tidak dipertahankan. Mempertahankan id akan
// bertabrakan kalau berkas yang sama dipulihkan dua kali atau dipulihkan ke
// akun yang sudah berisi. Tautan antar-entry tetap utuh lewat peta id lama
// -> id baru.
//
// Usage:
//   node scripts/import.mjs <berkas.json> --email you@example.com
//   node scripts/import.mjs <berkas.json> --user <userId>
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export function newId() {
  // cuid asli dibuat Prisma; untuk import cukup id unik yang stabil.
  return `imp_${randomUUID().replace(/-/g, "").slice(0, 21)}`;
}

/**
 * Field JSONB yang menyimpan id entry lain — referensi tersembunyi yang tidak
 * dijaga foreign key, jadi tidak ada cascade maupun error kalau salah.
 *
 * DAFTAR INI WAJIB DIPERBARUI setiap ada tipe entry baru yang menunjuk entry
 * lain lewat content. Kalau terlewat, restore akan "berhasil" tanpa error
 * sambil memutus relasinya diam-diam — persis yang terjadi pada habit_log
 * ketika Fase 4 menambahkannya dan script ini tidak ikut diperbarui.
 */
const CONTENT_ENTRY_REFS = {
  habit_log: ["habitId"],
};

function remapContent(entry, idMap) {
  const content = { ...(entry.content ?? {}) };
  for (const key of CONTENT_ENTRY_REFS[entry.type] ?? []) {
    const old = content[key];
    if (typeof old === "string" && idMap.has(old)) content[key] = idMap.get(old);
  }
  return content;
}

/** Mengembalikan jumlah baris yang ditulis per tabel. */
export async function importPayload(sql, userId, payload) {
  if (!payload || !Array.isArray(payload.entries)) {
    throw new Error("Berkas tidak berbentuk export yang dikenal (entries hilang).");
  }
  if (payload.version !== 1) {
    throw new Error(`Versi export ${payload.version} tidak dikenal.`);
  }

  // --- tag: dicocokkan per nama, bukan per id ---
  const tagIdByName = new Map();
  const existing = await sql.query(`SELECT id, name FROM "Tag" WHERE "userId" = $1`, [userId]);
  for (const row of existing) tagIdByName.set(row.name, row.id);

  const wantedTags = new Map();
  for (const tag of payload.tags ?? []) {
    wantedTags.set(tag.name, tag.label ?? tag.name);
  }
  for (const entry of payload.entries) {
    for (const link of entry.tags ?? []) {
      const tag = link.tag ?? link;
      if (tag?.name) wantedTags.set(tag.name, tag.label ?? tag.name);
    }
  }

  let tagsCreated = 0;
  for (const [name, label] of wantedTags) {
    if (tagIdByName.has(name)) continue;
    const id = newId();
    await sql.query(
      `INSERT INTO "Tag" (id, "userId", name, label) VALUES ($1, $2, $3, $4)`,
      [id, userId, name, label],
    );
    tagIdByName.set(name, id);
    tagsCreated++;
  }

  // --- entry ---
  //
  // Dua lintasan. Lintasan pertama HANYA menetapkan id baru, supaya referensi
  // ke entry mana pun sudah bisa dipetakan saat menulis — termasuk referensi
  // ke entry yang belum sempat ditulis.
  const idMap = new Map();
  for (const entry of payload.entries) idMap.set(entry.id, newId());

  let entriesCreated = 0;
  let entryTagsCreated = 0;

  for (const entry of payload.entries) {
    const id = idMap.get(entry.id);

    await sql.query(
      `INSERT INTO "Entry"
         (id, "userId", type, title, content, "occurredAt", source, "sourceId", "createdAt", "deletedAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::"EntrySource", $8, $9, $10)`,
      [
        id,
        userId,
        entry.type,
        entry.title ?? null,
        JSON.stringify(remapContent(entry, idMap)),
        entry.occurredAt,
        entry.source ?? "NATIVE",
        // sourceId dikosongkan: kunci idempotensi sync milik akun asal, dan
        // membawanya ikut akan menabrak sync akun tujuan.
        null,
        entry.createdAt ?? entry.occurredAt,
        entry.deletedAt ?? null,
      ],
    );
    entriesCreated++;

    for (const link of entry.tags ?? []) {
      const tag = link.tag ?? link;
      const tagId = tagIdByName.get(tag?.name);
      if (!tagId) continue;
      await sql.query(
        `INSERT INTO "EntryTag" ("entryId", "tagId") VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, tagId],
      );
      entryTagsCreated++;
    }
  }

  // --- tautan antar-entry: dipetakan ke id baru ---
  let linksCreated = 0;
  for (const link of payload.links ?? []) {
    const fromId = idMap.get(link.fromId);
    const toId = idMap.get(link.toId);
    // Tautan yang salah satu ujungnya tidak ikut di berkas dilewati diam-diam;
    // memaksakannya akan melanggar foreign key.
    if (!fromId || !toId) continue;

    await sql.query(
      `INSERT INTO "EntryLink" (id, "userId", "fromId", "toId", kind)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [newId(), userId, fromId, toId, link.kind ?? "related"],
    );
    linksCreated++;
  }

  return { entriesCreated, tagsCreated, entryTagsCreated, linksCreated };
}

// --- CLI --------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file] = process.argv.slice(2);
  const emailIdx = process.argv.indexOf("--email");
  const userIdx = process.argv.indexOf("--user");

  if (!file || (emailIdx === -1 && userIdx === -1)) {
    console.error("Usage: node scripts/import.mjs <berkas.json> --email <email> | --user <userId>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL belum diset.");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  let userId = userIdx !== -1 ? process.argv[userIdx + 1] : null;
  if (!userId) {
    const email = process.argv[emailIdx + 1];
    const rows = await sql.query(`SELECT id FROM "User" WHERE email = $1`, [email]);
    if (rows.length === 0) {
      console.error(`User dengan email ${email} tidak ditemukan.`);
      process.exit(1);
    }
    userId = rows[0].id;
  }

  const payload = JSON.parse(readFileSync(file, "utf8"));
  const result = await importPayload(sql, userId, payload);

  console.log("Import selesai:", result);
}
