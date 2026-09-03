"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEntry, softDeleteEntry } from "@/lib/entries/repository";
import { entryTypeSchema } from "@/lib/entries/schemas";

const captureSchema = z.object({
  type: entryTypeSchema,
  body: z.string().trim().min(1, "isi tidak boleh kosong"),
  title: z.string().trim().optional(),
});

export async function quickCapture(formData: FormData) {
  const input = captureSchema.parse({
    type: formData.get("type"),
    body: formData.get("body"),
    title: formData.get("title") || undefined,
  });

  await createEntry({
    type: input.type,
    title: input.title ?? null,
    content: { body: input.body },
  });

  revalidatePath("/");
}

export async function deleteEntry(id: string) {
  await softDeleteEntry(id);
  revalidatePath("/");
}
