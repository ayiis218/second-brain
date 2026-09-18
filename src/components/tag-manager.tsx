"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTagAction, renameTagAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type TagRow = { id: string; label: string; count: number };

export function TagManager({ tags }: { tags: TagRow[] }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);

  function onRename(id: string, formData: FormData) {
    startTransition(async () => {
      try {
        await renameTagAction(id, formData);
        setEditing(null);
        toast.success("Tag diganti nama");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal mengganti nama");
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTagAction(id);
        toast.success("Tag dihapus");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menghapus tag");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag</CardTitle>
        <CardDescription>
          Mengganti nama tag ke nama yang sudah ada akan menggabungkannya.
          Menghapus tag tidak menghapus entri-nya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada tag.</p>
        ) : (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li key={tag.id} className="rounded-lg border p-3 text-sm">
                {editing === tag.id ? (
                  <form
                    action={(formData) => onRename(tag.id, formData)}
                    className="flex gap-2"
                  >
                    <Input
                      name="label"
                      defaultValue={tag.label}
                      autoFocus
                      className="h-11 md:h-8"
                    />
                    <Button type="submit" size="touch" disabled={pending}>
                      Save
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left font-medium"
                      onClick={() => setEditing(tag.id)}
                    >
                      {tag.label}
                    </button>
                    <span className="text-xs text-muted-foreground">{tag.count}</span>
                    <Button
                      type="button"
                      size="icon-touch"
                      variant="outline"
                      aria-label={`Delete tag ${tag.label}`}
                      disabled={pending}
                      onClick={() => onDelete(tag.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
