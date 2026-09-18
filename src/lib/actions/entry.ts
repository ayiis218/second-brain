"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { revalidateEntryViews } from "@/lib/actions/revalidate";
import { contentFromFormData } from "@/lib/entries/form";
import {
  createEntry,
  listEntries,
  parseTagList,
  softDeleteEntry,
  updateEntry,
} from "@/lib/entries/repository";
import { isEntryType, userCreatableTypeSchema } from "@/lib/entries/schemas";

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
