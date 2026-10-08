"use server";

import { revalidatePath } from "next/cache";

import { setPin, verifyPin } from "./pin";
import {
  createAttachment,
  createLegacyItem,
  deleteAttachment,
  deleteLegacyItem,
  updateLegacyItem,
} from "./repository";
import { legacyCategorySchema, MAX_ATTACHMENT_BYTES } from "./schemas";

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

// --- PIN ------------------------------------------------------------------

function readPin(formData: FormData, field: string): string {
  const value = formData.get(field);
  if (typeof value !== "string") throw new Error("PIN tidak valid.");
  return value;
}

/** Setup pertama kali — dua kali ketik supaya salah ketik tidak mengunci diri sendiri. */
export async function setupVaultPinAction(formData: FormData) {
  const pin = readPin(formData, "pin");
  const confirmPin = readPin(formData, "confirmPin");
  if (pin !== confirmPin) throw new Error("PIN dan konfirmasinya tidak sama.");

  await setPin(pin);
  revalidatePath("/legacy");
}

export async function verifyVaultPinAction(formData: FormData) {
  await verifyPin(readPin(formData, "pin"));
  revalidatePath("/legacy");
}

/**
 * Dipanggil dari Settings, BUKAN dari dalam /legacy — sengaja tidak minta
 * PIN lama. Sesi Google yang sah sudah jadi bukti identitas, konsisten
 * dengan model kepercayaan yang sudah berlaku di aplikasi ini (lihat
 * revokeAllSessionsAction di src/lib/actions/account.ts: OAuth adalah akar
 * kepercayaan, bukan kredensial tambahan apa pun).
 */
export async function resetVaultPinAction(formData: FormData) {
  const pin = readPin(formData, "pin");
  const confirmPin = readPin(formData, "confirmPin");
  if (pin !== confirmPin) throw new Error("PIN dan konfirmasinya tidak sama.");

  await setPin(pin);
}
