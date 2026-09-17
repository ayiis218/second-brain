"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteAccountAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRM_WORD = "HAPUS";

export function DeleteAccount() {
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();
  const armed = confirmation.trim().toUpperCase() === CONFIRM_WORD;

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteAccountAction();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menghapus akun");
      }
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Hapus akun</CardTitle>
        <CardDescription>
          Seluruh entry, tag, dan tautanmu ikut terhapus permanen. Tindakan ini tidak
          bisa dibatalkan — ambil export lebih dulu kalau datanya masih dibutuhkan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="confirm-delete">
            Ketik <span className="font-mono font-medium">{CONFIRM_WORD}</span> untuk mengaktifkan
          </Label>
          <Input
            id="confirm-delete"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            className="h-11 md:h-8"
          />
        </div>
        <Button
          type="button"
          size="touch"
          variant="destructive"
          className="w-full md:w-auto"
          disabled={!armed || pending}
          onClick={onDelete}
        >
          {pending ? "Menghapus…" : "Hapus akun saya"}
        </Button>
      </CardContent>
    </Card>
  );
}
