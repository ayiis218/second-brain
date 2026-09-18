import { AlertTriangle, Clock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STALE_AFTER_DAYS, type FinanceSnapshotPayload } from "@/lib/sync/finance-snapshot";
import { formatDateTime } from "@/lib/time";

/**
 * Nominal datang sebagai string dan tetap string sampai titik ini.
 * `Number()` hanya muncul di sini, untuk memformat — bukan di jalur data.
 */
export function formatIdr(value: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${muted ? "text-muted-foreground" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function FinancePosition({
  payload,
  capturedAt,
  lastError,
  stale,
}: {
  payload: FinanceSnapshotPayload | null;
  capturedAt: Date | null;
  lastError: string | null;
  stale: boolean;
}) {
  if (!payload) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            Position unavailable
          </CardTitle>
          <CardDescription>
            Endpoint <code>/api/export/snapshot</code> di finance-dashboard belum ada,
            atau belum pernah berhasil dipanggil.
          </CardDescription>
        </CardHeader>
        {lastError ? (
          <CardContent className="text-sm text-destructive">{lastError}</CardContent>
        ) : null}
      </Card>
    );
  }

  const { totals, counts } = payload;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardDescription>Net position</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{formatIdr(totals.net)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Row label={`Accounts & wallets${counts ? ` (${counts.accounts})` : ""}`} value={formatIdr(totals.wallet)} />
            <Row label={`Assets${counts ? ` (${counts.assets})` : ""}`} value={formatIdr(totals.assets)} />
            <Row label={`Investments${counts ? ` (${counts.investments})` : ""}`} value={formatIdr(totals.investments)} />
            <Row label="Receivables" value={formatIdr(totals.piutang)} />
            <Row label="Debt" value={`− ${formatIdr(totals.utang)}`} muted />
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            Diambil {capturedAt ? formatDateTime(capturedAt) : "—"}
          </p>

          {stale ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Angka ini sudah lebih dari {STALE_AFTER_DAYS} hari. Perbarui finance-dashboard
              lalu jalankan sync — ahli waris yang membacanya tidak punya cara tahu
              angka ini sudah usang.
            </p>
          ) : null}

          {lastError ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Sync terakhir gagal: {lastError}. Angka di atas dari pengambilan sebelumnya.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {payload.monthlyExpense.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Monthly spending</CardTitle>
            <CardDescription>
              Perkiraan — batas bulannya mengikuti finance-dashboard, yang memakai
              waktu server, bukan WIB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payload.monthlyExpense.map((m) => (
              <Row key={m.month} label={m.month} value={formatIdr(m.total)} />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
