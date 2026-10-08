import { getAttachmentFile } from "@/lib/legacy/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unduhan lampiran vault — Route Handler, bukan server action: browser
 * perlu respons biner dengan header Content-Type/Content-Disposition yang
 * tidak bisa dikirim lewat jalur server action (pola sama dengan
 * /api/export, lihat settings/page.tsx).
 *
 * getAttachmentFile() sendiri yang memeriksa kepemilikan lewat
 * requireVaultAccess() + relasi item.userId — 404 di sini berarti "tidak
 * ada ATAU bukan milikmu", dua kasus yang sengaja tidak dibedakan.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // requireVaultAccess() di dalam getAttachmentFile() MELEMPAR untuk sesi
  // yang tidak punya entitlement sama sekali (bukan mengembalikan null) —
  // pemanggil yang bukan pelanggan vault tidak boleh tahu lampiran ini ada
  // ATAU tidak ada, jadi keduanya disamakan jadi 404 di sini.
  const file = await getAttachmentFile(id).catch(() => null);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
