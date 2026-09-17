import { timingSafeEqual } from "node:crypto";

import { runFinanceSync } from "@/lib/sync/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Sync bisa memakan beberapa halaman; default 10 detik terlalu pendek.
export const maxDuration = 60;

/**
 * Dipanggil Vercel Cron, bukan browser. Karena itu `api/cron` dikecualikan
 * dari matcher di src/proxy.ts — kalau ikut dijaga sesi, cron hanya akan
 * menerima redirect ke /login.
 *
 * Konsekuensinya endpoint ini WAJIB menjaga dirinya sendiri, dan fail closed:
 * tanpa CRON_SECRET ia mati, bukan terbuka.
 */
function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;

  const provided = Buffer.from(header.slice(7));
  const secret = Buffer.from(expected);
  if (provided.length !== secret.length) return false;

  return timingSafeEqual(provided, secret);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFinanceSync();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] sync finance gagal:", message);
    // 500 supaya kegagalan terlihat di dashboard cron Vercel, bukan lolos
    // sebagai sukses yang diam-diam tidak menyinkronkan apa pun.
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
