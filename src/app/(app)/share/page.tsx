import { ShareCapture } from "@/components/share-capture";

export const dynamic = "force-dynamic";

/**
 * Tujuan Web Share Target (lihat src/app/manifest.ts).
 *
 * Berada di dalam grup (app) supaya tetap dijaga sesi: berbagi ke aplikasi
 * yang belum login harus berakhir di halaman login, bukan di form yang
 * isinya hilang saat disimpan.
 */
export default async function SharePage({ searchParams }: PageProps<"/share">) {
  const { title, text, url } = await searchParams;

  const pick = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

  // Android mengirim tautan kadang di `text`, kadang di `url`; digabung
  // supaya tidak ada yang hilang apa pun perilaku aplikasi pengirimnya.
  const body = [pick(text), pick(url)].filter(Boolean).join("\n\n");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="px-1">
        <h1 className="text-lg font-semibold">Share</h1>
        <p className="text-sm text-muted-foreground">
          Simpan yang kamu bagikan dari aplikasi lain.
        </p>
      </div>
      <ShareCapture defaultTitle={pick(title)} defaultBody={body} />
    </div>
  );
}
