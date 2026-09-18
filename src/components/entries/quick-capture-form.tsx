"use client";

import { useRef, useState } from "react";

import { useAsyncAction } from "@/hooks/use-async-action";
import { quickCapture } from "@/lib/actions";
import { TYPE_OPTIONS } from "@/lib/entries/form";
import { EntryFields } from "@/components/entries/entry-fields";
import { TagInput } from "@/components/entries/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function QuickCaptureForm({
  onDone,
  autoFocus = false,
  suggestedTags = [],
  defaultTitle = "",
  defaultBody = "",
}: {
  onDone?: () => void;
  autoFocus?: boolean;
  suggestedTags?: string[];
  defaultTitle?: string;
  defaultBody?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<string>("note");
  const { pending, run } = useAsyncAction();

  // Untuk task dan habit, nama kegiatannya ADALAH judul; isi cuma catatan
  // tambahan. Menukar penekanan dua field ini menghilangkan kebiasaan
  // mengetik ulang judul di kolom "Isi" cuma supaya form mau disimpan.
  const titleIsPrimary = type === "task" || type === "habit";

  function onSubmit(formData: FormData) {
    run(
      async () => {
        await quickCapture(formData);
        formRef.current?.reset();
        setType("note");
        onDone?.();
      },
      { success: "Tersimpan", error: "Gagal menyimpan" },
    );
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <input type="hidden" name="type" value={type} />

      {/* Pemilih tipe sebagai tombol, bukan <Select>: satu ketukan alih-alih
          dua, dan pilihannya cuma tiga. */}
      <div role="group" aria-label="Entry type" className="flex gap-2">
        {TYPE_OPTIONS.map((t) => (
          <Button
            key={t.value}
            type="button"
            size="touch"
            variant={type === t.value ? "default" : "outline"}
            aria-pressed={type === t.value}
            className="flex-1"
            onClick={() => setType(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qc-title">
          {titleIsPrimary ? "Title" : "Title (optional)"}
        </Label>
        <Input
          id="qc-title"
          name="title"
          defaultValue={defaultTitle}
          placeholder={titleIsPrimary ? "Mis. Lari pagi" : "Judul singkat"}
          className="h-11 md:h-8"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qc-body">
          {titleIsPrimary ? "Note (optional)" : "Body"}
        </Label>
        <Textarea
          id="qc-body"
          name="body"
          rows={titleIsPrimary ? 2 : 4}
          autoFocus={autoFocus}
          defaultValue={defaultBody}
          placeholder="Tulis apa saja…"
          className={titleIsPrimary ? "min-h-16" : "min-h-28"}
        />
      </div>

      {/* Field berubah mengikuti tipe — form tidak seragam untuk semua entri. */}
      <EntryFields type={type} />

      <TagInput suggestions={suggestedTags} />

      <Button type="submit" size="touch" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
