import { verifyCronRequest } from "@/lib/cron-auth";
import { runFinanceSnapshotSync } from "@/lib/sync/finance-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Sync bisa memakan beberapa halaman; default 10 detik terlalu pendek.
export const maxDuration = 60;

/**
 * Dipanggil Vercel Cron, bukan browser. Karena itu `api/cron` dikecualikan
 * dari matcher di src/proxy.ts — kalau ikut dijaga sesi, cron hanya akan
 * menerima redirect ke /login.
 *
 * Konsekuensinya endpoint ini WAJIB menjaga dirinya sendiri lewat
 * verifyCronRequest(), fail closed: tanpa CRON_SECRET ia mati, bukan terbuka.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const payload = await runFinanceSnapshotSync();
    return Response.json({ ok: true, capturedAt: payload.capturedAt, net: payload.totals.net });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] sync finance gagal:", message);
    // 500 supaya kegagalan terlihat di dashboard cron Vercel, bukan lolos
    // sebagai sukses yang diam-diam tidak menyinkronkan apa pun.
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
