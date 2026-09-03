import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseEntryContent, type EntryType } from "./schemas";

/**
 * Satu-satunya modul yang boleh memanggil prisma.entry.*
 * Lihat catatan di schemas.ts — semua tulis melewati parseEntryContent().
 */

export async function createEntry<T extends EntryType>(input: {
  type: T;
  title?: string | null;
  content: unknown;
  occurredAt?: Date;
}) {
  const content = parseEntryContent(input.type, input.content);

  return prisma.entry.create({
    data: {
      type: input.type,
      title: input.title ?? null,
      content: content as Prisma.InputJsonValue,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

export async function updateEntryContent<T extends EntryType>(
  id: string,
  type: T,
  content: unknown,
) {
  const parsed = parseEntryContent(type, content);

  return prisma.entry.update({
    where: { id },
    data: { content: parsed as Prisma.InputJsonValue },
  });
}

export async function listEntries(opts?: { type?: EntryType; limit?: number }) {
  return prisma.entry.findMany({
    where: {
      deletedAt: null,
      ...(opts?.type ? { type: opts.type } : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: opts?.limit ?? 50,
    include: { tags: { include: { tag: true } } },
  });
}

export async function getEntry(id: string) {
  return prisma.entry.findFirst({
    where: { id, deletedAt: null },
    include: { tags: { include: { tag: true } } },
  });
}

export async function softDeleteEntry(id: string) {
  return prisma.entry.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export type EntryWithTags = Awaited<ReturnType<typeof listEntries>>[number];
