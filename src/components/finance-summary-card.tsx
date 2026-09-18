import Link from "next/link";
import { Wallet } from "lucide-react";

import { formatIdr } from "@/components/finance-position";
import { Card, CardContent } from "@/components/ui/card";
import { isOwner } from "@/lib/auth-user";
import { getFinanceSnapshot } from "@/lib/sync/finance-snapshot";

/**
 * Ringkasan posisi di beranda — khusus pemilik.
 *
 * Yang ditampilkan POSISI, bukan transaksi. Daftar transaksi sengaja tidak
 * pernah muncul di beranda: ia tumbuh jauh lebih cepat daripada catatan
 * buatan tangan dan akan selalu mendominasi, berapa pun batasnya dinaikkan.
 */
export async function FinanceSummaryCard() {
  if (!(await isOwner())) return null;

  const { payload, stale } = await getFinanceSnapshot();
  if (!payload) return null;

  return (
    <Link href="/finance" className="block">
      <Card className="transition-colors hover:border-ring">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-xs text-muted-foreground">Net position</span>
            {stale ? (
              <span className="ml-auto text-xs text-destructive">needs refresh</span>
            ) : null}
          </div>

          <p className="text-2xl font-semibold tabular-nums">
            {formatIdr(payload.totals.net)}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Wallet {formatIdr(payload.totals.wallet)}</span>
            <span>Assets {formatIdr(payload.totals.assets)}</span>
            <span>Investments {formatIdr(payload.totals.investments)}</span>
            <span>Debt {formatIdr(payload.totals.utang)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
