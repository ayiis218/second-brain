import { EmptyState } from "@/components/entry-list";
import { TrashList, type TrashRow } from "@/components/trash-list";
import { listTrash } from "@/lib/entries/repository";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

function bodyOf(content: unknown): string {
  if (content && typeof content === "object" && "body" in content) {
    const body = (content as { body: unknown }).body;
    if (typeof body === "string") return body;
  }
  return "";
}

export default async function TrashPage() {
  const entries = await listTrash();

  const rows: TrashRow[] = entries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    title: entry.title,
    body: bodyOf(entry.content),
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
