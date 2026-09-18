"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { deleteEntry, updateEntryAction } from "@/lib/actions";
import { TYPE_LABEL } from "@/lib/entries/form";
import { EntryFields, type EntryFieldDefaults } from "@/components/entries/entry-fields";
import { TagInput } from "@/components/entries/tag-input";
import { DestructiveConfirm } from "@/components/shared/destructive-confirm";
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
  const { pending, run } = useAsyncAction();

  function onSubmit(formData: FormData) {
    run(() => updateEntryAction(id, formData), {
      success: "Perubahan disimpan",
      error: "Gagal menyimpan",
    });
  }

  function onDelete() {
    // Tanpa toast sukses: deleteEntry mengarahkan ke backTo setelah berhasil,
    // jadi halamannya sudah berpindah.
    run(() => deleteEntry(id, backTo), { error: "Gagal menghapus" });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit {TYPE_LABEL[type] ?? type}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-3">
            <input type="hidden" name="type" value={type} />

            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                name="title"
                defaultValue={title ?? ""}
                placeholder="Judul singkat"
                className="h-11 md:h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-body">Body</Label>
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
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardContent className="p-4">
          <DestructiveConfirm
            trigger="Delete entry"
            message="Hapus entri ini? Ia akan hilang dari daftar, timeline, dan pencarian."
            confirmLabel="Yes, delete"
            pending={pending}
            onConfirm={onDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
