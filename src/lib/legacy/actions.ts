"use server";

import { revalidatePath } from "next/cache";

import {
  createAttachment,
  createLegacyItem,
  deleteAttachment,
  deleteLegacyItem,
  updateLegacyItem,
} from "./repository";
import { legacyCategorySchema } from "./schemas";

/** Dicocokkan juga di UI (legacy-vault.tsx) — satu tempat ganti kalau angkanya berubah. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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

// --- Lampiran -----------------------------------------------------------

export async function uploadLegacyAttachmentAction(itemId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Tidak ada berkas yang dikirim.");
  if (file.size === 0) throw new Error("Berkas kosong.");
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Berkas maksimal ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await createAttachment(itemId, {
    buffer,
    mimeType: file.type || "application/octet-stream",
  });
  revalidatePath("/legacy");
}

export async function deleteLegacyAttachmentAction(attachmentId: string) {
  const changed = await deleteAttachment(attachmentId);
  if (changed === 0) throw new Error("Lampiran tidak ditemukan.");
  revalidatePath("/legacy");
}
