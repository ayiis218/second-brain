import { timingSafeEqual } from "node:crypto";

/**
 * Memverifikasi request cron Vercel lewat header `Authorization: Bearer`.
 *
 * Dipakai setiap route di `api/cron/*` — jalur itu sengaja dikecualikan dari
 * penjagaan sesi di src/proxy.ts (dipanggil mesin, bukan browser), jadi
 * masing-masing WAJIB menjaga dirinya sendiri. Fail closed: tanpa
 * `CRON_SECRET` di environment, endpointnya mati, bukan terbuka.
 *
 * `timingSafeEqual`, bukan `===`: perbandingan string biasa membocorkan
 * berapa karakter awal yang sudah cocok lewat selisih waktu eksekusi.
 */
export function verifyCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;

  const provided = Buffer.from(header.slice(7));
  const secret = Buffer.from(expected);
  if (provided.length !== secret.length) return false;

  return timingSafeEqual(provided, secret);
}
