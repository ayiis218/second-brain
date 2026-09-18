"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useAsyncAction } from "@/hooks/use-async-action";
import { syncFinanceAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { formatIdr } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SyncButton() {
  const { pending, run } = useAsyncAction();

  function onSync() {
    // Toast suksesnya dibuat di dalam aksi, bukan lewat `messages.success`:
    // pesannya memuat angka hasil sync yang baru ada setelah aksinya selesai.
    run(
      async () => {
        const payload = await syncFinanceAction();
        toast.success(`Posisi diperbarui — ${formatIdr(payload.totals.net)}`);
      },
      { error: "Sinkronisasi gagal" },
    );
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
