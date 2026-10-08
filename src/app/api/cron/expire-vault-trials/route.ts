import { verifyCronRequest } from "@/lib/cron-auth";
import { expireStaleTrials } from "@/lib/legacy/trial-expiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dipanggil Vercel Cron — lihat catatan yang sama di
 * api/cron/sync-finance/route.ts soal kenapa `api/cron` dikecualikan dari
 * penjagaan sesi dan wajib menjaga dirinya sendiri.
 *
 * BUKAN gerbang akses: hasVaultAccess() sudah menolak trial yang lewat
 * tanggal terlepas dari job ini pernah berjalan atau belum. Ini menjaga
 * `status` mencerminkan kenyataan untuk ringkasan funnel di Settings.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const expired = await expireStaleTrials();
    return Response.json({ ok: true, expired });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] expire vault trials gagal:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
