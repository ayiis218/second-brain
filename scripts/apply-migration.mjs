// Menerapkan satu migrasi Prisma ke Neon lewat driver HTTP-nya (port 443)
// alih-alih protokol wire Postgres (port 5432).
//
// Kenapa: di sebagian jaringan, TLS handshake ke proxy Neon di 5432 reset
// terus-menerus, dan `prisma migrate deploy` gagal. Driver serverless Neon
// bicara lewat HTTPS biasa dan lolos. Ia hanya menjalankan satu statement per
// request, jadi file migrasi dipecah dulu, lalu dieksekusi berurutan dan
// dicatat ke `_prisma_migrations` supaya `prisma migrate status`/`deploy`
// mengenalinya nanti.
//
// Pakai `npx prisma migrate deploy` lebih dulu; script ini cadangan.
//
// Usage: node scripts/apply-migration.mjs <nama_folder_migrasi>
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

/**
 * Pemecah statement yang menghormati dollar-quoting Postgres.
 *
 * Versi naif `.split(";")` merusak body fungsi PL/pgSQL, yang isinya penuh
 * titik koma di dalam `$fn$ ... $fn$`. Migrasi init_core memuat dua fungsi
 * trigger, jadi ini bukan kasus teoretis.
 */
function splitStatements(rawSql) {
  const sql = rawSql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = [];
  let current = "";
  let dollarTag = null;

  for (let i = 0; i < sql.length; i++) {
    const rest = sql.slice(i);

    if (dollarTag) {
      if (rest.startsWith(dollarTag)) {
        current += dollarTag;
        i += dollarTag.length - 1;
        dollarTag = null;
        continue;
      }
    } else {
      const open = /^\$[A-Za-z_]*\$/.exec(rest);
      if (open) {
        dollarTag = open[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
      if (sql[i] === ";") {
        if (current.trim()) statements.push(current.trim());
        current = "";
        continue;
      }
    }
    current += sql[i];
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

const migrationName = process.argv[2];
if (!migrationName) {
  console.error("Usage: node scripts/apply-migration.mjs <nama_folder_migrasi>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

const sqlPath = `prisma/migrations/${migrationName}/migration.sql`;
const fullSql = readFileSync(sqlPath, "utf8");
const checksum = createHash("sha256").update(fullSql).digest("hex");
const statements = splitStatements(fullSql);

const sql = neon(process.env.DATABASE_URL);

await sql.query(`
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  );
`);

const existing = await sql.query(
  `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1`,
  [migrationName],
);
if (existing.length > 0) {
  console.log(`Migrasi ${migrationName} sudah tercatat, dilewati.`);
  process.exit(0);
}

for (const statement of statements) {
  await sql.query(statement);
  console.log("OK:", statement.slice(0, 70).replace(/\s+/g, " "));
}

await sql.query(
  `INSERT INTO "_prisma_migrations"
     (id, checksum, finished_at, migration_name, applied_steps_count)
   VALUES ($1, $2, now(), $3, $4)`,
  [randomUUID(), checksum, migrationName, statements.length],
);

console.log(`\nMigrasi diterapkan dan dicatat: ${migrationName}`);
