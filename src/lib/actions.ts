"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/auth";
import { isOwner, requireUserId } from "@/lib/auth-user";
import { contentFromFormData } from "@/lib/entries/form";
import {
  createEntry,
  deleteOwnAccount,
  deleteTag,
  parseTagList,
  renameTag,
  setTaskStatus,
  softDeleteEntry,
  updateEntry,
} from "@/lib/entries/repository";
import { entryTypeSchema } from "@/lib/entries/schemas";
import { createInvite, revokeInvite } from "@/lib/invites";

const captureSchema = z.object({
  type: entryTypeSchema,
  body: z.string().trim().min(1, "isi tidak boleh kosong"),
  title: z.string().trim().optional(),
});

function readEntryForm(formData: FormData) {
  const parsed = captureSchema.parse({
    type: formData.get("type"),
    body: formData.get("body"),
    title: formData.get("title") || undefined,
  });

  return {
    ...parsed,
    content: contentFromFormData(parsed.type, formData),
    tags: parseTagList(formData.get("tags") as string | null),
  };
}

export async function quickCapture(formData: FormData) {
  const input = readEntryForm(formData);

  await createEntry({
    type: input.type,
    title: input.title ?? null,
    content: input.content,
    tags: input.tags,
  });

  revalidateEntryViews();
}

export async function updateEntryAction(id: string, formData: FormData) {
  const input = readEntryForm(formData);

  const changed = await updateEntry({
    id,
    type: input.type,
    title: input.title ?? null,
    content: input.content,
    tags: input.tags,
  });

  if (changed === 0) {
    throw new Error("Entry tidak ditemukan atau tidak bisa diubah.");
  }

  revalidateEntryViews();
  revalidatePath(`/entry/${id}`);
}

export async function deleteEntry(id: string) {
  await softDeleteEntry(id);
  revalidateEntryViews();
  redirect("/");
}

export async function toggleTaskDone(id: string, done: boolean) {
  await setTaskStatus(id, done ? "done" : "todo");
  revalidateEntryViews();
}

// --- Tag --------------------------------------------------------------------

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

// --- Undangan (khusus pemilik) ---------------------------------------------

export async function createInviteAction(formData: FormData) {
  if (!(await isOwner())) throw new Error("Hanya pemilik yang bisa membuat undangan.");

  const userId = await requireUserId();
  const email = (formData.get("email") as string | null)?.trim() || null;

  await createInvite({ createdById: userId, email });
  revalidatePath("/settings");
}

export async function revokeInviteAction(id: string) {
  if (!(await isOwner())) throw new Error("Hanya pemilik yang bisa mencabut undangan.");

  const userId = await requireUserId();
  await revokeInvite(id, userId);
  revalidatePath("/settings");
}

// --- Sesi -------------------------------------------------------------------

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

// --- Hapus akun -------------------------------------------------------------

/**
 * Syarat sebelum mengundang siapa pun (rencana induk §12): user harus bisa
 * menghapus dirinya sendiri beserta seluruh datanya.
 *
 * Pemilik tidak boleh menghapus akunnya lewat jalur ini — datanya menaungi
 * undangan user lain, dan penghapusan tak sengaja tidak bisa dibatalkan.
 */
export async function deleteAccountAction() {
  if (await isOwner()) {
    throw new Error("Akun pemilik tidak bisa dihapus lewat aplikasi.");
  }

  await deleteOwnAccount();
  await signOut({ redirectTo: "/login" });
}

function revalidateEntryViews() {
  revalidatePath("/");
  revalidatePath("/timeline");
  revalidatePath("/task");
  revalidatePath("/journal");
}
