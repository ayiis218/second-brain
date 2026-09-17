import { EmptyState, EntryCard } from "@/components/entry-list";
import { TimelineFilter } from "@/components/timeline-filter";
import { TimelineMore } from "@/components/timeline-more";
import { listEntries, type EntryWithTags } from "@/lib/entries/repository";
import { isEntryType } from "@/lib/entries/schemas";
import { dayKey, formatDayLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Pengelompokan memakai dayKey() — batas hari WIB, bukan UTC. Kalau memakai
 * tanggal UTC, entry yang ditulis sebelum jam 07:00 WIB akan jatuh ke
 * kelompok hari sebelumnya.
 */
function groupByDay(entries: EntryWithTags[]) {
  const groups = new Map<string, { label: string; entries: EntryWithTags[] }>();

  for (const entry of entries) {
    const key = dayKey(entry.occurredAt);
    let group = groups.get(key);
    if (!group) {
      group = { label: formatDayLabel(entry.occurredAt), entries: [] };
      groups.set(key, group);
    }
    group.entries.push(entry);
  }

  return [...groups.entries()];
}

export default async function TimelinePage({ searchParams }: PageProps<"/timeline">) {
  const { type } = await searchParams;
  const typeFilter = isEntryType(type) ? type : undefined;
  const { entries, nextCursor } = await listEntries({ limit: 50, type: typeFilter });
  const groups = groupByDay(entries);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <h1 className="px-1 text-lg font-semibold">Timeline</h1>
      <TimelineFilter />

      {groups.length === 0 ? (
        <EmptyState>Belum ada entry untuk ditampilkan.</EmptyState>
      ) : (
        groups.map(([key, group]) => (
          <section key={key} className="space-y-3">
            <h2 className="sticky top-14 z-20 -mx-4 bg-background/95 px-5 py-2 text-xs font-medium text-muted-foreground backdrop-blur md:mx-0 md:px-1">
              {group.label}
            </h2>
            <div className="space-y-3">
              {group.entries.map((entry, i) => (
                <EntryCard key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          </section>
        ))
      )}

      {nextCursor ? (
        <TimelineMore initialCursor={nextCursor} type={typeFilter} />
      ) : (
        <p className="py-2 text-center text-xs text-muted-foreground">Sudah sampai ujung.</p>
      )}
    </div>
  );
}
