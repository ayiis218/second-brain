// Verifikasi penjagaan akses.
//
// Yang diuji: pencabutan sesi menolak token lama, token baru tetap diterima,
// dan perangkat baru terdeteksi. Logikanya ditiru persis dari
// src/lib/auth-user.ts — kalau salah satunya berubah, tes ini harus ikut.
//
// Usage: npm run db:verify:access
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const U = "verify7-user";
let fail = 0;
const check = (n, ok, d = "") => {
  console.log(`${ok ? "✓" : "✗"} ${n}${d ? "  — " + d : ""}`);
  if (!ok) fail++;
};

const cleanup = () => sql.query(`DELETE FROM "User" WHERE id = $1`, [U]);
await cleanup();
await sql.query(`INSERT INTO "User" (id, email) VALUES ($1, $2)`, [U, "verify7@example.test"]);

/**
 * Aturan yang sama dengan validatedSession() di src/lib/auth-user.ts,
 * tapi dibandingkan dalam DETIK EPOCH, bukan objek Date.
 *
 * Kenapa: kolomnya `TIMESTAMP(3)` tanpa zona waktu. Prisma menulis dan
 * membacanya konsisten sebagai UTC — sudah diverifikasi, selisih 0 detik.
 * Tapi driver @neondatabase/serverless yang dipakai script ini menafsirkan
 * nilai naif itu sebagai waktu LOKAL, sehingga terbaca 7 jam lebih awal di
 * mesin WIB. Versi pertama tes ini tertipu justru oleh itu, dan sempat
 * melaporkan bug yang tidak ada.
 *
 * `extract(epoch ...)` menghasilkan angka yang tidak ambigu, jadi tesnya
 * mengukur aturannya — bukan kebiasaan driver.
 */
const tokenAccepted = (issuedAtSeconds, validAfterEpoch) =>
  validAfterEpoch === null || issuedAtSeconds >= validAfterEpoch;

const readValidAfter = async () => {
  const [r] = await sql.query(
    `SELECT extract(epoch from "sessionsValidAfter")::float8 AS v FROM "User" WHERE id = $1`,
    [U],
  );
  return r.v === null ? null : Number(r.v);
};

// --- sebelum dicabut, token lama diterima ---
const tokenLama = Math.floor(Date.now() / 1000) - 3600;
check("sebelum dicabut, token lama diterima", tokenAccepted(tokenLama, await readValidAfter()));

// --- cabut ---
await sql.query(
  `UPDATE "User" SET "sessionsValidAfter" = now() AT TIME ZONE 'UTC' WHERE id = $1`,
  [U],
);
const validAfter = await readValidAfter();
check("penanda pencabutan tersimpan", validAfter !== null);
check(
  "token lama DITOLAK setelah dicabut",
  !tokenAccepted(tokenLama, validAfter),
  "inilah yang memutus akses HP yang hilang",
);

// --- login ulang menerbitkan token baru ---
const tokenBaru = Math.floor(Date.now() / 1000) + 5;
check("token baru (login ulang) tetap diterima", tokenAccepted(tokenBaru, validAfter));

// --- perangkat dikenal ---
await sql.query(
  `INSERT INTO "KnownDevice" (id,"userId",fingerprint,label) VALUES ('v7-d1',$1,'fp-hp','Chrome di Android')`,
  [U],
);
try {
  await sql.query(
    `INSERT INTO "KnownDevice" (id,"userId",fingerprint,label) VALUES ('v7-dup',$1,'fp-hp','Chrome di Android')`,
    [U],
  );
  check("perangkat sama tidak tercatat dua kali", false, "insert malah berhasil");
} catch {
  check("perangkat sama tidak tercatat dua kali", true);
}

await sql.query(
  `INSERT INTO "KnownDevice" (id,"userId",fingerprint,label) VALUES ('v7-d2',$1,'fp-laptop','Safari di macOS')`,
  [U],
);
const devices = await sql.query(`SELECT id FROM "KnownDevice" WHERE "userId" = $1`, [U]);
check("perangkat berbeda tercatat terpisah", devices.length === 2, `${devices.length} perangkat`);

// --- hapus akun ikut membersihkan ---
await cleanup();
const left = await sql.query(`SELECT id FROM "KnownDevice" WHERE "userId" = $1`, [U]);
check("hapus akun ikut menghapus daftar perangkat", left.length === 0);

console.log(fail === 0 ? "\nPenjagaan akses aman." : `\n${fail} pemeriksaan GAGAL.`);
process.exit(fail === 0 ? 0 : 1);
