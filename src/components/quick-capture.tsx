"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { quickCapture } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const TYPES = [
  { value: "note", label: "Catatan" },
  { value: "journal", label: "Journal" },
  { value: "task", label: "Task" },
] as const;

export function QuickCapture() {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<string>("note");
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await quickCapture(formData);
        formRef.current?.reset();
        toast.success("Tersimpan");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick capture</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={onSubmit} className="space-y-3">
          <input type="hidden" name="type" value={type} />

          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Button
                key={t.value}
                type="button"
                size="sm"
                variant={type === t.value ? "default" : "outline"}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Judul (opsional)</Label>
            <Input id="title" name="title" placeholder="Judul singkat" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Isi</Label>
            <Textarea
              id="body"
              name="body"
              required
              rows={4}
              placeholder="Tulis apa saja…"
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
