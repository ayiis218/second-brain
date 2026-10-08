import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VaultFunnelSummary } from "@/lib/legacy/vault-funnel";

/**
 * Murni tampilan, tanpa aksi apa pun — jadi tidak perlu "use client" seperti
 * InviteManager (yang punya tombol buat/cabut). Sebelum ini, satu-satunya
 * cara tahu angka funnel adalah `db:sql` manual.
 */
export function VaultFunnelSummaryCard({ summary }: { summary: VaultFunnelSummary }) {
  const { counts, expiringSoon } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel Legacy Vault</CardTitle>
        <CardDescription>
          Pendaftar lewat /vault — di luar undangan Second Brain biasa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Trial {counts.TRIAL}</Badge>
          <Badge variant="secondary">Active {counts.ACTIVE}</Badge>
          <Badge variant="outline">Expired {counts.EXPIRED}</Badge>
          <Badge variant="outline">Canceled {counts.CANCELED}</Badge>
        </div>

        {expiringSoon.length > 0 ? (
          <div className="space-y-1.5 border-t pt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="size-3.5" aria-hidden />
              Trial berakhir dalam 3 hari
            </p>
            <ul className="space-y-1 text-sm">
              {expiringSoon.map((row) => (
                <li key={row.email} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">{row.email}</span>
                  <span className="shrink-0 tabular-nums">
                    {row.daysLeft} hari lagi
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
