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
        const result = await syncFinanceAction();
        toast.success(
          `Sync selesai — ${result.created} baru, ${result.updated} diperbarui, ${result.deleted} dihapus`,
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sync gagal");
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
      {pending ? "Menyinkronkan…" : "Sync sekarang"}
    </Button>
  );
}
