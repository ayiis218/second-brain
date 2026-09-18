"use server";

import { revalidatePath } from "next/cache";

import { revalidateEntryViews } from "@/lib/actions/revalidate";
import { deleteTag, renameTag } from "@/lib/entries/repository";

export async function renameTagAction(id: string, formData: FormData) {
  const label = ((formData.get("label") as string | null) ?? "").trim();
  if (!label) throw new Error("Nama tag tidak boleh kosong.");

  await renameTag(id, label);
  revalidateEntryViews();
  revalidatePath("/settings");
}

export async function deleteTagAction(id: string) {
  await deleteTag(id);
  revalidateEntryViews();
  revalidatePath("/settings");
}
