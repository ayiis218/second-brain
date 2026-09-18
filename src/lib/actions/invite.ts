"use server";

import { revalidatePath } from "next/cache";

import { isOwner, requireUserId } from "@/lib/auth-user";
import { createInvite, revokeInvite } from "@/lib/invites";

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
