"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { quickCapture } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TYPES = [
  { value: "note", label: "Catatan" },
  { value: "journal", label: "Journal" },
  { value: "task", label: "Task" },
] as const;

export function QuickCaptureForm({
  onDone,
  autoFocus = false,
}: {
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<string>("note");
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await quickCapture(formData);
        formRef.current?.reset();
        setType("note");
        toast.success("Tersimpan");
        onDone?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <input type="hidden" name="type" value={type} />

      {/* Pemilih tipe sebagai tombol, bukan <Select>: satu ketukan alih-alih
          dua, dan pilihannya cuma tiga. */}
      <div role="group" aria-label="Tipe entry" className="flex gap-2">
        {TYPES.map((t) => (
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
        <Label htmlFor="qc-title">Judul (opsional)</Label>
        <Input id="qc-title" name="title" placeholder="Judul singkat" className="h-11 md:h-8" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qc-body">Isi</Label>
        <Textarea
          id="qc-body"
          name="body"
          required
          rows={4}
          autoFocus={autoFocus}
          placeholder="Tulis apa saja…"
          className="min-h-28"
        />
      </div>

      <Button type="submit" size="touch" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </Button>
    </form>
  );
}
