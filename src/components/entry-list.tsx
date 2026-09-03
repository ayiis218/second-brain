import { FadeIn } from "@/components/fade-in";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

export function EntryCard({ entry, index = 0 }: { entry: EntryWithTags; index?: number }) {
  return (
    <FadeIn index={index}>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TYPE_LABEL[entry.type] ?? entry.type}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDateTime(entry.occurredAt)}
            </span>
          </div>

          {entry.title ? <h3 className="font-medium leading-snug">{entry.title}</h3> : null}

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
        </CardContent>
      </Card>
    </FadeIn>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export function EntryList({ entries }: { entries: EntryWithTags[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState>
        Belum ada entry. Ketuk tombol{" "}
        <span className="font-medium text-foreground">+</span> di kanan bawah untuk menulis.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <EntryCard key={entry.id} entry={entry} index={i} />
      ))}
    </div>
  );
}
