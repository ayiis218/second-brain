import { verifyCronRequest } from "@/lib/cron-auth";
import { purgeExpiredTrash } from "@/lib/entries/trash-retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;

/**
 * Dipanggil Vercel Cron — lihat catatan yang sama di
 * api/cron/sync-finance/route.ts soal kenapa `api/cron` dikecualikan dari
 * penjagaan sesi dan wajib menjaga dirinya sendiri.
 *
 * Menepati janji di halaman Trash ("dihapus otomatis setelah 30 hari"):
 * sebelum cron ini ada, satu-satunya jalan menghapus permanen adalah tombol
 * "Kosongkan sekarang" yang dipencet manual — trash yang tidak pernah dibuka
 * menumpuk selamanya.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const purged = await purgeExpiredTrash(RETENTION_DAYS);
    return Response.json({ ok: true, purged });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] purge trash gagal:", message);
    // 500 supaya kegagalan terlihat di dashboard cron Vercel, bukan lolos
    // sebagai sukses yang diam-diam tidak menghapus apa pun.
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
