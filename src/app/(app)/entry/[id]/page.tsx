import { notFound } from "next/navigation";

import { EntryEditor } from "@/components/entries/entry-editor";
import { EntryLinks } from "@/components/entries/entry-links";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TYPE_LABEL } from "@/lib/entries/form";
import { getEntry, listLinks, listTags } from "@/lib/entries/repository";
import { formatDateTime, isoToDateInput } from "@/lib/time";

export const dynamic = "force-dynamic";

function contentField<T>(content: unknown, key: string): T | null {
  if (content && typeof content === "object" && key in content) {
    return (content as Record<string, T>)[key] ?? null;
  }
  return null;
}

export default async function EntryDetailPage({ params }: PageProps<"/entry/[id]">) {
  const { id } = await params;

  // getEntry ber-scope user: entry milik orang lain mengembalikan null,
  // dan halaman ini menjadi 404 — bukan 403 yang justru membocorkan
  // bahwa id tersebut ada.
  const entry = await getEntry(id);
  if (!entry) notFound();

  const body = contentField<string>(entry.content, "body") ?? "";
  const tags = entry.tags.map(({ tag }) => tag.label);

  const links = await listLinks(entry.id);

  // Entry hasil sync bersumber dari finance-dashboard dan read-only di sini
  // (rencana induk §6.3). Perubahan dilakukan di aplikasi asalnya.
  if (entry.source !== "NATIVE") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{TYPE_LABEL[entry.type] ?? entry.type}</Badge>
              <Badge variant="outline">Hasil sync — read-only</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(entry.occurredAt)}
              </span>
            </div>
            {entry.title ? <h1 className="font-medium">{entry.title}</h1> : null}
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
          </CardContent>
        </Card>

        {/* Read-only untuk isinya, tapi tetap bisa ditautkan — menghubungkan
            journal dengan transaksi yang memicunya adalah inti Fase 3. */}
        <EntryLinks entryId={entry.id} links={links} />
      </div>
    );
  }

  const allTags = await listTags();

  // Balik ke halaman modul asalnya. Menghapus habit lalu mendarat di
  // beranda membuat orang harus menavigasi ulang cuma untuk menghapus
  // yang berikutnya.
  const backTo =
    entry.type === "habit"
      ? "/habit"
      : entry.type === "task"
        ? "/task"
        : entry.type === "journal"
          ? "/journal"
          : "/";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <p className="px-1 text-xs text-muted-foreground">
        Dibuat {formatDateTime(entry.occurredAt)}
      </p>
      <EntryEditor
        id={entry.id}
        type={entry.type}
        title={entry.title}
        body={body}
        tags={tags}
        suggestedTags={allTags.map((tag) => tag.label)}
        backTo={backTo}
        fieldDefaults={{
          mood: contentField<number>(entry.content, "mood"),
          status: contentField<string>(entry.content, "status"),
          priority: contentField<string>(entry.content, "priority"),
          dueAt: isoToDateInput(contentField<string>(entry.content, "dueAt")),
        }}
      />
      <EntryLinks entryId={entry.id} links={links} />
    </div>
  );
}
