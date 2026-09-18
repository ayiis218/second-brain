"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { emptyTrashAction, purgeEntryAction, restoreEntryAction } from "@/lib/actions";
import { TYPE_LABEL } from "@/lib/entries/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type TrashRow = {
  id: string;
  type: string;
  title: string | null;
  body: string;
  deletedLabel: string;
};

export function TrashList({ rows }: { rows: TrashRow[] }) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>, ok: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          size="touch"
          variant="outline"
          className="text-destructive"
          disabled={pending}
          onClick={() => run(emptyTrashAction, "Tempat sampah dikosongkan")}
        >
          Empty now
        </Button>
      </div>

      {rows.map((row) => (
        <Card key={row.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{TYPE_LABEL[row.type] ?? row.type}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                dihapus {row.deletedLabel}
              </span>
            </div>
            {row.title ? <h3 className="font-medium">{row.title}</h3> : null}
            <p className="line-clamp-2 text-sm text-muted-foreground">{row.body}</p>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                size="touch"
                variant="outline"
                className="flex-1"
                disabled={pending}
                onClick={() => run(() => restoreEntryAction(row.id), "Dipulihkan")}
              >
                <RotateCcw className="size-4" aria-hidden />
                Restore
              </Button>
              <Button
                type="button"
                size="icon-touch"
                variant="outline"
                aria-label="Delete permanently"
                disabled={pending}
                onClick={() => run(() => purgeEntryAction(row.id), "Dihapus permanen")}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
