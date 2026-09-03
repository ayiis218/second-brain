import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EntryWithTags } from "@/lib/entries/repository";
import { formatDateTime } from "@/lib/time";

const TYPE_LABEL: Record<string, string> = {
  note: "Catatan",
  journal: "Journal",
  task: "Task",
  transaction: "Transaksi",
};

/** `content` sudah divalidasi Zod saat ditulis; setiap tipe menjamin `body`. */
function bodyOf(content: unknown): string {
  if (content && typeof content === "object" && "body" in content) {
    const body = (content as { body: unknown }).body;
    if (typeof body === "string") return body;
  }
  return "";
}

export function EntryList({ entries }: { entries: EntryWithTags[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Belum ada entry. Tulis sesuatu lewat quick capture di atas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entry terakhir</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => (
          <article key={entry.id} className="space-y-1 border-b pb-4 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{TYPE_LABEL[entry.type] ?? entry.type}</Badge>
              {entry.title ? <span className="font-medium">{entry.title}</span> : null}
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(entry.occurredAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {bodyOf(entry.content)}
            </p>
            {entry.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {entry.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
