import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";

import { signIn } from "@/auth";
import { VAULT_INTENT_COOKIE } from "@/lib/legacy/access";
import { CATEGORY_LABEL, LEGACY_CATEGORIES } from "@/lib/legacy/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

/**
 * Landing publik produk Legacy Vault — jalur pendaftaran yang TIDAK butuh
 * undangan Second Brain (lihat VAULT_INTENT_COOKIE, dan cabang di signIn/
 * createUser di src/auth.ts).
 *
 * Sengaja di luar grup (app): halaman ini harus bisa diakses tanpa sesi,
 * dan dikecualikan dari penjagaan di src/proxy.ts seperti /login dan /invite.
 */
export default function VaultLandingPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm overflow-hidden pt-0">
        <div className="bg-brand-gradient flex h-24 items-center justify-center">
          <ShieldCheck className="size-10 text-white" aria-hidden />
        </div>
        <CardHeader>
          <CardTitle>Legacy Vault</CardTitle>
          <CardDescription>
            Tempat ahli warismu tahu harus mencari apa, di mana, dan lewat jalur klaim
            apa — kalau suatu saat terjadi sesuatu padamu. Seluruh isinya terenkripsi;
            hanya kamu yang bisa membukanya selama akunmu aktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {LEGACY_CATEGORIES.map((category) => (
              <Badge key={category} variant="secondary">
                {CATEGORY_LABEL[category]}
              </Badge>
            ))}
          </div>

          <form
            action={async () => {
              "use server";

              // Cookie DISET DI SINI, bukan saat halaman dirender — pola sama
              // dengan /invite/[code]/page.tsx: Next hanya mengizinkan
              // penulisan cookie di Server Action atau Route Handler.
              (await cookies()).set(VAULT_INTENT_COOKIE, "1", {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
                maxAge: 60 * 30,
              });

              // Lompat langsung ke vault, bukan dashboard Second Brain —
              // pelanggan jalur ini tidak pernah perlu melihatnya.
              await signIn("google", { redirectTo: "/legacy" });
            }}
          >
            <Button type="submit" size="touch" className="w-full">
              Mulai masa coba gratis 14 hari
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Sudah punya akun Second Brain?{" "}
            <a href="/login" className="underline underline-offset-2">
              Masuk di sini
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
