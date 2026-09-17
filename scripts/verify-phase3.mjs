// Verifikasi Fase 3 di level database.
//
// Yang diuji: isolasi entry hasil sync, kunci idempotensi per-user, dan
// tautan antar-entry (journal <-> transaksi). Propagasi hapus/edit dari
// finance-dashboard diuji terpisah karena butuh dua database sekaligus.
//
// Usage: npm run db:verify:phase3
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const A = "verify4-a";
const B = "verify4-b";

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures++;
};

const cleanup = () => sql.query(`DELETE FROM "User" WHERE id IN ($1, $2)`, [A, B]);
await cleanup();

await sql.query(`INSERT INTO "User" (id, email) VALUES ($1, $2), ($3, $4)`, [
  A, "verify4-a@example.test", B, "verify4-b@example.test",
]);

const TX_CONTENT = `{"body":"Makan · warung","txType":"EXPENSE","category":"Makan","amount":"15000","accountName":"BRI","toAccountName":null,"affectsBalance":true}`;

await sql.query(
  `INSERT INTO "Entry" (id, "userId", type, title, content, "occurredAt", source, "sourceId")
   VALUES ('v4-tx-a', $1, 'transaction', 'Makan', $2::jsonb, now(), 'FINANCE', 'TX-100')`,
  [A, TX_CONTENT],
);
await sql.query(
  `INSERT INTO "Entry" (id, "userId", type, title, content, "occurredAt")
   VALUES ('v4-jr-a', $1, 'journal', 'Boros hari ini', '{"body":"jajan terus","mood":2}', now())`,
  [A],
);

// --- transaksi ikut terindeks search -----------------------------------------
const found = await sql.query(
  `SELECT id FROM "Entry"
    WHERE "userId" = $1 AND "searchVector" @@ websearch_to_tsquery('simple','warung')`,
  [A],
);
check("transaksi hasil sync bisa dicari", found.length === 1);

// --- isolasi: user lain tidak melihatnya -------------------------------------
const crossUser = await sql.query(
  `SELECT id FROM "Entry" WHERE "userId" = $1 AND source = 'FINANCE'`,
  [B],
);
check("transaksi milik A tidak terlihat oleh B", crossUser.length === 0);

// --- idempotensi sync per-user -----------------------------------------------
try {
  await sql.query(
    `INSERT INTO "Entry" (id, "userId", type, content, "occurredAt", source, "sourceId")
     VALUES ('v4-dup', $1, 'transaction', $2::jsonb, now(), 'FINANCE', 'TX-100')`,
    [A, TX_CONTENT],
  );
  check("sourceId duplikat dalam satu user ditolak", false, "insert malah berhasil");
} catch {
  check("sourceId duplikat dalam satu user ditolak", true);
}

try {
  await sql.query(
    `INSERT INTO "Entry" (id, "userId", type, content, "occurredAt", source, "sourceId")
     VALUES ('v4-tx-b', $1, 'transaction', $2::jsonb, now(), 'FINANCE', 'TX-100')`,
    [B, TX_CONTENT],
  );
  check("sourceId sama boleh dipakai user berbeda", true);
} catch (error) {
  check("sourceId sama boleh dipakai user berbeda", false, error.message);
}

// --- tautan journal <-> transaksi --------------------------------------------
await sql.query(
  `INSERT INTO "EntryLink" (id, "userId", "fromId", "toId", kind)
   VALUES ('v4-link', $1, 'v4-jr-a', 'v4-tx-a', 'related')`,
  [A],
);
const bothWays = await sql.query(
  `SELECT id FROM "EntryLink"
    WHERE "userId" = $1 AND ("fromId" = 'v4-tx-a' OR "toId" = 'v4-tx-a')`,
  [A],
);
check("tautan terbaca dari sisi transaksi juga", bothWays.length === 1);

try {
  await sql.query(
    `INSERT INTO "EntryLink" (id, "userId", "fromId", "toId", kind)
     VALUES ('v4-link2', $1, 'v4-jr-a', 'v4-tx-a', 'related')`,
    [A],
  );
  check("tautan ganda arah sama ditolak", false, "insert malah berhasil");
} catch {
  check("tautan ganda arah sama ditolak", true);
}

// --- hapus entry ikut menghapus tautannya ------------------------------------
await sql.query(`DELETE FROM "Entry" WHERE id = 'v4-tx-a'`);
const orphan = await sql.query(`SELECT id FROM "EntryLink" WHERE id = 'v4-link'`);
check("menghapus entry ikut menghapus tautannya (cascade)", orphan.length === 0);

// --- SyncState ada dan tunggal ------------------------------------------------
const cols = await sql.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'SyncState'`,
);
check(
  "SyncState punya kedua cursor terpisah",
  cols.some((c) => c.column_name === "txCursor") &&
    cols.some((c) => c.column_name === "delCursor"),
);

await cleanup();
console.log(failures === 0 ? "\nFase 3 aman." : `\n${failures} pemeriksaan GAGAL.`);
process.exit(failures === 0 ? 0 : 1);
