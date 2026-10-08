"use client";

import { ShieldCheck } from "lucide-react";

import { useAsyncAction } from "@/hooks/use-async-action";
import { setupVaultPinAction, verifyVaultPinAction } from "@/lib/legacy/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Layar antara — ditampilkan `/legacy/page.tsx` SEBELUM `<LegacyVault>`,
 * bukan di atasnya: isi vault baru didekripsi dan dikirim ke browser
 * setelah halaman memastikan `isUnlocked()` benar, jadi tidak ada versi
 * "vault kelihatan sekilas lalu ketutup PIN" di sini.
 */
export function PinGate({ mode }: { mode: "setup" | "verify" }) {
  const { pending, run } = useAsyncAction();

  function onSubmit(formData: FormData) {
    const action = mode === "setup" ? setupVaultPinAction : verifyVaultPinAction;
    run(() => action(formData), {
      error: mode === "setup" ? "Gagal membuat PIN" : "PIN salah",
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Card className="overflow-hidden pt-0">
        <div className="bg-brand-gradient flex h-20 items-center justify-center">
          <ShieldCheck className="size-8 text-white" aria-hidden />
        </div>
        <CardHeader>
          <CardTitle>{mode === "setup" ? "Buat PIN Legacy" : "Masukkan PIN"}</CardTitle>
          <CardDescription>
            {mode === "setup"
              ? "Lapis tambahan khusus vault ini — diminta tiap kali kamu membukanya, terpisah dari login Google."
              : "Konfirmasi ini benar kamu sebelum vault terbuka."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pg-pin">PIN (4-6 digit)</Label>
              <Input
                id="pg-pin"
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                autoComplete="off"
                autoFocus
                required
                className="h-11 md:h-9"
              />
            </div>

            {mode === "setup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="pg-confirm">Ulangi PIN</Label>
                <Input
                  id="pg-confirm"
                  name="confirmPin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  autoComplete="off"
                  required
                  className="h-11 md:h-9"
                />
              </div>
            ) : null}

            <Button type="submit" size="touch" className="w-full" disabled={pending}>
              {pending
                ? "Memeriksa…"
                : mode === "setup"
                  ? "Buat PIN"
                  : "Buka vault"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
