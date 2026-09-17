import { notFound } from "next/navigation";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { LegacyVault, type VaultItem } from "@/components/legacy/legacy-vault";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isOwner } from "@/lib/auth-user";
import { vaultReady } from "@/lib/legacy/crypto";
import { countByCategory, countIncomplete, listByCategory } from "@/lib/legacy/repository";
import { LEGACY_CATEGORIES } from "@/lib/legacy/schemas";

export const dynamic = "force-dynamic";

export default async function LegacyPage() {
  // Menyembunyikan menu BUKAN kontrol akses — halaman ini menolak sendiri.
  // 404, bukan 403: keberadaan modul pun tidak perlu dikonfirmasi.
  if (!(await isOwner())) notFound();

  if (!vaultReady()) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" aria-hidden />
              Vault belum bisa dipakai
            </CardTitle>
            <CardDescription>
              <code>LEGACY_MASTER_KEY</code> belum diset. Generate dengan{" "}
              <code>openssl rand -base64 32</code>, lalu isi di environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Vault sengaja menolak menulis apa pun tanpa kunci — data sensitif yang
            tersimpan tanpa enkripsi tidak bisa ditarik kembali setelah terlanjur ada.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [counts, incomplete] = await Promise.all([countByCategory(), countIncomplete()]);

  // Hanya kategori yang ada isinya yang didekripsi. Kategori kosong cukup
  // dihitung — itu gunanya `category` dibiarkan plaintext.
  const itemsByCategory: Record<string, VaultItem[]> = {};
  for (const category of LEGACY_CATEGORIES) {
    if (!counts[category]) continue;
    itemsByCategory[category] = (await listByCategory(category)).map((item) => ({
      id: item.id,
      category: item.category,
      content: item.content,
      incomplete: item.incomplete,
    }));
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="space-y-1 px-1">
        <h1 className="text-lg font-semibold">Legacy</h1>
        <p className="text-xs text-muted-foreground">
          Gudang informasi untuk ahli waris. Seluruh isinya terenkripsi; hanya nama
          kategori yang tersimpan apa adanya.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          {incomplete > 0 ? (
            <>
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              <p>
                <span className="font-medium">{incomplete} item</span> belum punya langkah
                klaim. Ahli waris tahu barangnya ada, tapi tidak tahu cara mengambilnya.
              </p>
            </>
          ) : (
            <>
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p>
                {total === 0
                  ? "Vault masih kosong. Mulai dari rekening dan dokumen penting."
                  : `${total} item tercatat, semuanya lengkap dengan langkah klaim.`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <LegacyVault counts={counts} itemsByCategory={itemsByCategory} />
    </div>
  );
}
