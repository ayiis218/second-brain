"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { syncFinanceAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SyncButton() {
  const [pending, startTransition] = useTransition();

  function onSync() {
    startTransition(async () => {
      try {
        const payload = await syncFinanceAction();
        const net = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(Number(payload.totals.net));
        toast.success(`Posisi diperbarui — ${net}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sinkronisasi gagal");
      }
    });
  }

  return (
    <Button
      type="button"
      size="touch"
      variant="outline"
      className="w-full md:w-auto"
      disabled={pending}
      onClick={onSync}
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
      {pending ? "Syncing…" : "Sync now"}
    </Button>
  );
}
