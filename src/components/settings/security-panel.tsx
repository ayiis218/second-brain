"use client";

import { LogOut, ShieldAlert, Smartphone } from "lucide-react";

import { useAsyncAction } from "@/hooks/use-async-action";
import { revokeAllSessionsAction } from "@/lib/actions";
import { DestructiveConfirm } from "@/components/shared/destructive-confirm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type DeviceRow = { id: string; label: string; lastSeenLabel: string };

export function SecurityPanel({ devices }: { devices: DeviceRow[] }) {
  const { pending, run } = useAsyncAction();

  function onRevoke() {
    // Tanpa toast sukses: aksinya memutus sesi ini juga dan langsung
    // berpindah ke /login.
    run(() => revokeAllSessionsAction(), { error: "Gagal mencabut sesi" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4" aria-hidden />
          Access security
        </CardTitle>
        <CardDescription>
          Kalau HP hilang atau ada yang membuka aplikasimu, keluarkan semua
          perangkat. Ini memutus akses tanpa menghapus data apa pun — dan bisa
          dibatalkan dengan login lagi.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {devices.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Known devices</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <Smartphone className="size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{d.label}</span>
                  <span className="shrink-0 text-xs">{d.lastSeenLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DestructiveConfirm
          trigger={
            <>
              <LogOut className="size-4" aria-hidden />
              Sign out all devices
            </>
          }
          message={
            <>
              Seluruh perangkat akan keluar, <span className="font-medium">termasuk yang
              sedang kamu pakai sekarang</span>. Datamu tidak ada yang terhapus.
            </>
          }
          confirmLabel={pending ? "Signing out…" : "Yes, sign out all"}
          pending={pending}
          onConfirm={onRevoke}
        />
      </CardContent>
    </Card>
  );
}
