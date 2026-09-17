"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteEntry, updateEntryAction } from "@/lib/actions";
import { TYPE_LABEL } from "@/lib/entries/form";
import { EntryFields, type EntryFieldDefaults } from "@/components/entries/entry-fields";
import { TagInput } from "@/components/entries/tag-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EntryEditor({
  id,
  type,
  title,
  body,
  tags,
  fieldDefaults,
  suggestedTags,
  backTo = "/",
}: {
  id: string;
  type: string;
  title: string | null;
  body: string;
  tags: string[];
  fieldDefaults: EntryFieldDefaults;
  suggestedTags: string[];
  backTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateEntryAction(id, formData);
        toast.success("Perubahan disimpan");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      try {
        // deleteEntry mengarahkan ke backTo setelah berhasil, jadi tidak
        // ada toast sukses — halamannya sudah berpindah.
        await deleteEntry(id, backTo);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menghapus");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ubah {TYPE_LABEL[type] ?? type}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-3">
            <input type="hidden" name="type" value={type} />

            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Judul</Label>
              <Input
                id="edit-title"
                name="title"
                defaultValue={title ?? ""}
                placeholder="Judul singkat"
                className="h-11 md:h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-body">Isi</Label>
              <Textarea
                id="edit-body"
                name="body"
                rows={8}
                defaultValue={body}
                className="min-h-40"
              />
            </div>

            <EntryFields type={type} defaults={fieldDefaults} />
            <TagInput suggestions={suggestedTags} defaultTags={tags} />

            <Button type="submit" size="touch" className="w-full md:w-auto" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardContent className="space-y-3 p-4">
          {confirmingDelete ? (
            <>
              <p className="text-sm">
                Hapus entry ini? Ia akan hilang dari daftar, timeline, dan pencarian.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="touch"
                  variant="destructive"
                  className="flex-1"
                  disabled={pending}
                  onClick={onDelete}
                >
                  Ya, hapus
                </Button>
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Batal
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              size="touch"
              variant="outline"
              className="w-full text-destructive md:w-auto"
              onClick={() => setConfirmingDelete(true)}
            >
              Hapus entry
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
