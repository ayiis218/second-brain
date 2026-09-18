import { notFound } from "next/navigation";

import { FinancePosition } from "@/components/finance/finance-position";
import { SyncButton } from "@/components/finance/sync-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isOwner } from "@/lib/auth-user";
import { getFinanceSnapshot } from "@/lib/sync/finance-snapshot";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  // Menyembunyikan menu BUKAN kontrol akses — halaman ini menolak sendiri.
  if (!(await isOwner())) notFound();

  const snapshot = await getFinanceSnapshot();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="space-y-1 px-1">
        <h1 className="text-lg font-semibold">Finance</h1>
        <p className="text-xs text-muted-foreground">
          Ringkasan posisi dari finance-dashboard, read-only. Riwayat transaksi
          sengaja tidak ditampilkan di sini — tempatnya di aplikasi asalnya.
        </p>
      </div>

      <FinancePosition
        payload={snapshot.payload}
        capturedAt={snapshot.capturedAt}
        lastError={snapshot.lastError}
        stale={snapshot.stale}
      />

      <Card>
        <CardHeader>
          <CardTitle>Sync</CardTitle>
          <CardDescription>
            Berjalan otomatis tiap hari. Tombol ini untuk menariknya sekarang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SyncButton />
        </CardContent>
      </Card>
    </div>
  );
}
