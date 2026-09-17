import { EmptyState } from "@/components/entry-list";
import { TaskList, type TaskGroup, type TaskRow } from "@/components/task-list";
import { listTasks, type EntryWithTags } from "@/lib/entries/repository";
import { dayKey, dayRange, formatDayLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

function field<T>(content: unknown, key: string): T | null {
  if (content && typeof content === "object" && key in content) {
    return (content as Record<string, T>)[key] ?? null;
  }
  return null;
}

/**
 * Pengelompokan memakai dayRange()/dayKey() dari lib/time.ts — batas harinya
 * WIB. Kalau memakai perbandingan UTC, task jatuh tempo hari ini yang dibuat
 * lewat tengah malam WIB akan salah masuk grup "Terlambat".
 */
function groupTasks(entries: EntryWithTags[]): TaskGroup[] {
  const { end: todayEnd } = dayRange();
  const todayKey = dayKey();

  const overdue: TaskRow[] = [];
  const today: TaskRow[] = [];
  const upcoming: TaskRow[] = [];
  const undated: TaskRow[] = [];

  for (const entry of entries) {
    const dueIso = field<string>(entry.content, "dueAt");
    const due = dueIso ? new Date(dueIso) : null;
    const dueKey = due ? dayKey(due) : null;

    const row: TaskRow = {
      id: entry.id,
      title: entry.title,
      body: field<string>(entry.content, "body") ?? "",
      status: field<string>(entry.content, "status") ?? "todo",
      priority: field<string>(entry.content, "priority") ?? "medium",
      dueLabel: due ? formatDayLabel(due) : null,
      overdue: Boolean(due && dueKey !== todayKey && due < todayEnd),
    };

    if (!due) undated.push(row);
    else if (dueKey === todayKey) today.push(row);
    else if (due < todayEnd) overdue.push(row);
    else upcoming.push(row);
  }

  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const byPriority = (a: TaskRow, b: TaskRow) => (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);

  return [
    { key: "overdue", label: "Terlambat", tasks: overdue.sort(byPriority) },
    { key: "today", label: "Hari ini", tasks: today.sort(byPriority) },
    { key: "upcoming", label: "Mendatang", tasks: upcoming.sort(byPriority) },
    { key: "undated", label: "Tanpa tanggal", tasks: undated.sort(byPriority) },
  ].filter((group) => group.tasks.length > 0);
}

export default async function TaskPage() {
  const entries = await listTasks();
  const groups = groupTasks(entries);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="px-1 text-lg font-semibold">Task</h1>

      {groups.length === 0 ? (
        <EmptyState>Tidak ada task yang menunggu. Semua beres.</EmptyState>
      ) : (
        <TaskList groups={groups} />
      )}
    </div>
  );
}
