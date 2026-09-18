"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { signOutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  function onSignOut() {
    startTransition(async () => {
      try {
        // signOutAction mengarahkan ke /login, jadi tidak ada toast sukses —
        // halamannya sudah berpindah.
        await signOutAction();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal keluar");
      }
    });
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
