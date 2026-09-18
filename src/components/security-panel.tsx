"use client";

import { useState, useTransition } from "react";
import { LogOut, ShieldAlert, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { revokeAllSessionsAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type DeviceRow = { id: string; label: string; lastSeenLabel: string };

export function SecurityPanel({ devices }: { devices: DeviceRow[] }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onRevoke() {
    startTransition(async () => {
      try {
        await revokeAllSessionsAction();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal mencabut sesi");
      }
    });
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

        {confirming ? (
          <div className="space-y-3">
            <p className="text-sm">
              Seluruh perangkat akan keluar, <span className="font-medium">termasuk yang
              sedang kamu pakai sekarang</span>. Datamu tidak ada yang terhapus.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="touch"
                variant="destructive"
                className="flex-1"
                disabled={pending}
                onClick={onRevoke}
              >
                {pending ? "Signing out…" : "Yes, sign out all"}
              </Button>
              <Button
                type="button"
                size="touch"
                variant="outline"
                className="flex-1"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="touch"
            variant="outline"
            className="w-full text-destructive md:w-auto"
            onClick={() => setConfirming(true)}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out all devices
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
