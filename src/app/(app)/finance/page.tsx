import { notFound } from "next/navigation";

import { EmptyState, EntryCard } from "@/components/entry-list";
import { SyncButton } from "@/components/sync-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isOwner } from "@/lib/auth-user";
import { listEntries } from "@/lib/entries/repository";
import { getSyncState } from "@/lib/sync/finance";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

function formatIdr(amount: string) {
  // amount berupa string karena presisi Decimal; Number() hanya di sini,
  // untuk menampilkan — tidak pernah di jalur data.
  const value = Number(amount);
  if (Number.isNaN(value)) return amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function field<T>(content: unknown, key: string): T | null {
  if (content && typeof content === "object" && key in content) {
    return (content as Record<string, T>)[key] ?? null;
  }
  return null;
}

export default async function FinancePage() {
  // Menyembunyikan menu BUKAN kontrol akses — halaman ini harus menolak
  // sendiri. 404, bukan 403: keberadaan modul pun tidak perlu dibocorkan.
  if (!(await isOwner())) notFound();

  const [entries, state] = await Promise.all([
    listEntries({ type: "transaction", limit: 100 }),
    getSyncState(),
  ]);

  const total = entries.reduce((sum, entry) => {
    const amount = Number(field<string>(entry.content, "amount") ?? "0");
    const type = field<string>(entry.content, "txType");
    if (Number.isNaN(amount)) return sum;
    return type === "INCOME" ? sum + amount : sum - amount;
  }, 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="px-1 text-lg font-semibold">Finance</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sinkronisasi</CardTitle>
          <CardDescription>
            Data ditarik read-only dari finance-dashboard. Perubahan dilakukan di
            aplikasi itu, bukan di sini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="space-y-1 text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>Terakhir dijalankan</dt>
              <dd className="text-right">
                {state?.lastRunAt ? formatDateTime(state.lastRunAt) : "belum pernah"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Transaksi tersimpan</dt>
              <dd className="text-right">{entries.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Selisih (masuk − keluar)</dt>
              <dd className="text-right font-medium text-foreground">{formatIdr(String(total))}</dd>
            </div>
          </dl>

          {state?.lastError ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive">
              Sync terakhir gagal: {state.lastError}
            </p>
          ) : null}

          <SyncButton />
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <EmptyState>
          Belum ada transaksi tersinkron. Jalankan sync, atau pastikan
          FINANCE_API_URL dan FINANCE_SYNC_TOKEN sudah diisi.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <EntryCard key={entry.id} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
