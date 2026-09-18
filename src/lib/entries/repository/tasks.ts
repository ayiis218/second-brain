import type { Prisma } from "@prisma/client";

import { scopedDb } from "@/lib/db";
import { parseEntryContent } from "../schemas";
import { WITH_TAGS } from "./shared";

/**
 * Task disimpan di `content` JSONB, bukan tabel terpisah — lihat
 * rencana-fase-2-second-brain.md §3. Query-nya ditopang expression index
 * parsial pada (content->>'status') dan (content->>'dueAt').
 */
export async function listTasks(opts?: { includeDone?: boolean }) {
  const db = await scopedDb();

  const entries = await db.entry.findMany({
    where: {
      type: "task",
      deletedAt: null,
      ...(opts?.includeDone
        ? {}
        : { NOT: { content: { path: ["status"], equals: "done" } } }),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: 500,
    include: WITH_TAGS,
  });

  return entries;
}

export async function setTaskStatus(id: string, status: string) {
  const db = await scopedDb();

  const entry = await db.entry.findFirst({ where: { id, type: "task", deletedAt: null } });
  if (!entry) return 0;

  const content = parseEntryContent("task", {
    ...(entry.content as Record<string, unknown>),
    status,
  });

  const result = await db.entry.updateMany({
    where: { id },
    data: { content: content as Prisma.InputJsonValue },
  });

  return result.count;
}
