"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { resetVaultPinAction } from "@/lib/legacy/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Dipanggil dari Settings, bukan dari dalam /legacy — sengaja TIDAK minta
 * PIN lama. Sesi Google yang sah sudah jadi bukti identitas, pola yang
 * sama dengan resetVaultPinAction di lib/legacy/actions.ts.
 */
export function VaultPinSettings() {
  const { pending, run } = useAsyncAction();

  function onSubmit(formData: FormData) {
    run(() => resetVaultPinAction(formData), { success: "PIN diperbarui", error: "Gagal menyimpan PIN" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PIN Legacy</CardTitle>
        <CardDescription>
          Dibuat atau diganti di sini kapan saja — tanpa perlu PIN lama. Berlaku lain
          kali kamu membuka Legacy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="vps-pin">PIN baru</Label>
            <Input
              id="vps-pin"
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              autoComplete="off"
              required
              className="h-11 w-28 md:h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vps-confirm">Ulangi</Label>
            <Input
              id="vps-confirm"
              name="confirmPin"
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              autoComplete="off"
              required
              className="h-11 w-28 md:h-8"
            />
          </div>
          <Button type="submit" size="touch" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan PIN"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
