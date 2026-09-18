"use server";

import { revalidatePath } from "next/cache";

import { createLink, deleteLink, searchEntries } from "@/lib/entries/repository";

export async function linkEntryAction(fromId: string, toId: string) {
  await createLink(fromId, toId);
  revalidatePath(`/entry/${fromId}`);
  revalidatePath(`/entry/${toId}`);
}

export async function unlinkEntryAction(linkId: string, entryId: string) {
  await deleteLink(linkId);
  revalidatePath(`/entry/${entryId}`);
}

/** Pencarian untuk pemilih tautan. Hasilnya sudah ber-scope user. */
export async function searchForLinkAction(query: string, excludeId: string) {
  const hits = await searchEntries(query, { limit: 8 });
  return hits
    .filter((hit) => hit.id !== excludeId)
    .map((hit) => ({ id: hit.id, type: hit.type, title: hit.title }));
}
