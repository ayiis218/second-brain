import Link from "next/link";
import { Wallet } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { BalanceVisibilityToggle } from "@/components/shared/balance-visibility";
import { Card, CardContent } from "@/components/ui/card";
import { formatIdr } from "@/lib/format";
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
            {/* ml-auto cuma kalau stale badge-nya tidak ada — keduanya sama-sama
                mendorong ke kanan, tapi tidak boleh dobel. */}
            <BalanceVisibilityToggle className={stale ? "" : "ml-auto"} />
          </div>

          <p className="text-2xl font-semibold tabular-nums">
            <Amount>{formatIdr(payload.totals.net)}</Amount>
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Wallet <Amount>{formatIdr(payload.totals.wallet)}</Amount></span>
            <span>Assets <Amount>{formatIdr(payload.totals.assets)}</Amount></span>
            <span>Investments <Amount>{formatIdr(payload.totals.investments)}</Amount></span>
            <span>Debt <Amount>{formatIdr(payload.totals.utang)}</Amount></span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
