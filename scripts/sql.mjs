// Menjalankan SQL ad-hoc lewat driver HTTP Neon.
//
// Ada karena `psql`/port 5432 tidak bisa dijangkau dari jaringan ini (P1001),
// sementara verifikasi Fase 1 butuh membaca hasil trigger langsung dari
// database — hal yang tidak bisa dilihat lewat Prisma Client.
//
// Usage:
//   npm run db:sql -- "SELECT 1"
//   npm run db:sql -- --file path/to/query.sql
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

const args = process.argv.slice(2);
let statements;

if (args[0] === "--file") {
  const raw = readFileSync(args[1], "utf8");
  statements = raw
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
} else {
  statements = [args.join(" ")];
}

if (statements.length === 0 || !statements[0]) {
  console.error('Usage: npm run db:sql -- "SELECT 1"');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

for (const statement of statements) {
  try {
    const rows = await sql.query(statement);
    console.log(`\n> ${statement.slice(0, 90).replace(/\s+/g, " ")}`);
    console.table(rows);
  } catch (error) {
    console.log(`\n> ${statement.slice(0, 90).replace(/\s+/g, " ")}`);
    console.error(`  ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
