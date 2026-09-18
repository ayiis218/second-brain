import { EmptyState } from "@/components/shared/empty-state";
import { TrashList, type TrashRow } from "@/components/trash/trash-list";
import { getEntryBody } from "@/lib/entries/content";
import { listTrash } from "@/lib/entries/repository";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const entries = await listTrash();

  const rows: TrashRow[] = entries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    title: entry.title,
    body: getEntryBody(entry.content),
    deletedLabel: entry.deletedAt ? formatDateTime(entry.deletedAt) : "—",
  }));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="space-y-1 px-1">
        <h1 className="text-lg font-semibold">Trash</h1>
        <p className="text-xs text-muted-foreground">
          Entri di sini dihapus otomatis setelah 30 hari.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState>Tempat sampah kosong.</EmptyState>
      ) : (
        <TrashList rows={rows} />
      )}
    </div>
  );
}
