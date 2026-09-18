"use client";

import { LogOut } from "lucide-react";

import { useAsyncAction } from "@/hooks/use-async-action";
import { signOutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { pending, run } = useAsyncAction();

  function onSignOut() {
    // Tanpa toast sukses: signOutAction mengarahkan ke /login, jadi halamannya
    // sudah berpindah sebelum toast-nya sempat terbaca.
    run(() => signOutAction(), { error: "Gagal keluar" });
  }

  return (
    <Button
      type="button"
      size="touch"
      variant="outline"
      className="w-full md:w-auto"
      disabled={pending}
      onClick={onSignOut}
    >
      <LogOut className="size-4" aria-hidden />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
