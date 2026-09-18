"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { toggleTaskDone } from "@/lib/actions";
import { PRIORITY_OPTIONS } from "@/lib/entries/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TaskRow = {
  id: string;
  title: string | null;
  body: string;
  status: string;
  priority: string;
  dueLabel: string | null;
  overdue: boolean;
};

export type TaskGroup = { key: string; label: string; tasks: TaskRow[] };

const PRIORITY_LABEL = Object.fromEntries(
  PRIORITY_OPTIONS.map((option) => [option.value, option.label]),
);

function TaskItem({ task }: { task: TaskRow }) {
  const [pending, startTransition] = useTransition();

  // useOptimistic: di koneksi mobile, jeda round-trip membuat centang terasa
  // rusak. Status berubah lebih dulu, lalu dikoreksi kalau server menolak.
  const [done, setDone] = useOptimistic(task.status === "done");

  function toggle() {
    startTransition(async () => {
      setDone(!done);
      try {
        await toggleTaskDone(task.id, !done);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memperbarui task");
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          disabled={pending}
          onClick={toggle}
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
            done ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {done ? "✓" : null}
        </button>

        <Link href={`/entry/${task.id}`} className="min-w-0 flex-1 space-y-1">
          <p className={cn("font-medium leading-snug", done && "text-muted-foreground line-through")}>
            {task.title || task.body || "(untitled)"}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {task.dueLabel ? (
              <Badge variant={task.overdue ? "destructive" : "outline"}>{task.dueLabel}</Badge>
            ) : null}
            {task.priority !== "medium" ? (
              <Badge variant="secondary">{PRIORITY_LABEL[task.priority] ?? task.priority}</Badge>
            ) : null}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

export function TaskList({ groups }: { groups: TaskGroup[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            {group.label}
            <span className="ml-2 text-xs">{group.tasks.length}</span>
          </h2>
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
