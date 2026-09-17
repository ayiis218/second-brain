"use server";

import { revalidatePath } from "next/cache";

import {
  createLegacyItem,
  deleteLegacyItem,
  updateLegacyItem,
} from "./repository";
import { legacyCategorySchema } from "./schemas";

/**
 * Action vault. Seluruh pemeriksaan kepemilikan ada di repository — kalau
 * dilakukan di sini saja, satu action baru yang lupa memanggilnya langsung
 * membuka seluruh vault.
 */

function readForm(formData: FormData) {
  return {
    category: legacyCategorySchema.parse(formData.get("category")),
    content: {
      title: formData.get("title") ?? "",
      detail: formData.get("detail") ?? "",
      institution: formData.get("institution") ?? "",
      identifier: formData.get("identifier") ?? "",
      location: formData.get("location") ?? "",
      accessNote: formData.get("accessNote") ?? "",
      claimSteps: formData.get("claimSteps") ?? "",
      contactName: formData.get("contactName") ?? "",
      contactPhone: formData.get("contactPhone") ?? "",
    },
  };
}

export async function createLegacyItemAction(formData: FormData) {
  const input = readForm(formData);
  await createLegacyItem(input);
  revalidatePath("/legacy");
}

export async function updateLegacyItemAction(id: string, formData: FormData) {
  const input = readForm(formData);
  const changed = await updateLegacyItem({ id, ...input });
  if (changed === 0) throw new Error("Item tidak ditemukan.");
  revalidatePath("/legacy");
}

export async function deleteLegacyItemAction(id: string) {
  await deleteLegacyItem(id);
  revalidatePath("/legacy");
}
