"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/auth";
import { isOwner, requireUserId } from "@/lib/auth-user";
import { contentFromFormData } from "@/lib/entries/form";
import {
  createEntry,
  createLink,
  deleteLink,
  deleteOwnAccount,
  deleteTag,
  parseTagList,
  purgeEntry,
  purgeOldTrash,
  renameTag,
  restoreEntry,
  searchEntries,
  listEntries,
  setTaskStatus,
  toggleHabitDay,
  softDeleteEntry,
  updateEntry,
} from "@/lib/entries/repository";
import { isEntryType, userCreatableTypeSchema } from "@/lib/entries/schemas";
import { createInvite, revokeInvite } from "@/lib/invites";
import { runFinanceSync } from "@/lib/sync/finance";

const captureSchema = z
  .object({
    type: userCreatableTypeSchema,
    body: z.string().trim().default(""),
    title: z.string().trim().optional(),
  })
  // Yang wajib adalah "ada isinya", bukan "kolom Isi terisi". Untuk task dan
  // habit, judul sudah cukup — "Lari pagi" tidak butuh penjelasan tambahan.
  .refine((v) => Boolean(v.title) || Boolean(v.body), {
    message: "judul atau isi harus diisi",
    path: ["body"],
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

/**
 * `backTo` dipakai supaya menghapus dari halaman Habit atau Task tidak
 * melempar orang ke beranda — tiap kali itu terjadi, aplikasinya terasa
 * kehilangan tempat.
 */
export async function deleteEntry(id: string, backTo = "/") {
  await softDeleteEntry(id);
  revalidateEntryViews();
  redirect(backTo);
}

export async function toggleTaskDone(id: string, done: boolean) {
  await setTaskStatus(id, done ? "done" : "todo");
  revalidateEntryViews();
}

// --- Tempat sampah ----------------------------------------------------------

export async function restoreEntryAction(id: string) {
  const count = await restoreEntry(id);
  if (count === 0) throw new Error("Entry tidak ada di tempat sampah.");
  revalidateEntryViews();
  revalidatePath("/trash");
}

export async function purgeEntryAction(id: string) {
  await purgeEntry(id);
  revalidatePath("/trash");
}

export async function emptyTrashAction() {
  // 0 hari = kosongkan semuanya sekarang, bukan hanya yang sudah lewat 30 hari.
  const count = await purgeOldTrash(0);
  revalidatePath("/trash");
  return count;
}

// --- Paginasi ----------------------------------------------------------------

export async function loadMoreEntriesAction(params: {
  cursor: string;
  type?: string;
  tagId?: string;
  nativeOnly?: boolean;
}) {
  // listEntries sudah ber-scope user lewat sesi, jadi cursor dari klien tidak
  // bisa dipakai mengintip data orang lain — paling jauh ia hanya menggeser
  // posisi di dalam daftar miliknya sendiri.
  return listEntries({
    cursor: params.cursor,
    type: isEntryType(params.type) ? params.type : undefined,
    tagId: params.tagId,
    // Wajib ikut dibawa: tanpa ini halaman pertama bersih tapi halaman
    // kedua tiba-tiba memuat transaksi lagi.
    nativeOnly: params.nativeOnly,
  });
}

// --- Habit ------------------------------------------------------------------

export async function toggleHabitAction(habitId: string, dayKey: string) {
  const result = await toggleHabitDay(habitId, dayKey);
  revalidatePath("/habit");
  revalidatePath("/insight");
  return result;
}

// --- Tautan antar-entry -----------------------------------------------------

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

// --- Sync finance (khusus pemilik) -----------------------------------------

/**
 * Menjalankan sync secara manual. Cron tetap jalur utamanya, tapi di plan
 * Hobby Vercel cron dibatasi sekali sehari — tanpa tombol ini pemilik harus
 * menunggu sampai besok untuk melihat transaksi terbaru.
 */
export async function syncFinanceAction() {
  if (!(await isOwner())) throw new Error("Hanya pemilik yang bisa menjalankan sync.");

  const result = await runFinanceSync();

  revalidateEntryViews();
  revalidatePath("/finance");
  return result;
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
