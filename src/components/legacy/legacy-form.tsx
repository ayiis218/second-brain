"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createLegacyItemAction, updateLegacyItemAction } from "@/lib/legacy/actions";
import {
  CATEGORY_LABEL,
  CLAIM_HINT,
  CLAIM_REQUIRED,
  LEGACY_CATEGORIES,
  type LegacyContent,
} from "@/lib/legacy/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  { name: "institution", label: "Lembaga / penerbit", hint: "BRI, Bibit, BPJS Ketenagakerjaan" },
  { name: "identifier", label: "Nomor", hint: "rekening, sertifikat, polis" },
  { name: "location", label: "Lokasi fisik", hint: "brankas kamar, map biru lemari atas" },
  { name: "contactName", label: "Nama kontak", hint: "" },
  { name: "contactPhone", label: "Telepon kontak", hint: "" },
] as const;

export function LegacyForm({
  id,
  defaultCategory,
  defaultContent,
  onDone,
}: {
  id?: string;
  defaultCategory?: string;
  defaultContent?: LegacyContent;
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState(defaultCategory ?? "KEUANGAN");
  const [pending, startTransition] = useTransition();

  const claimRequired = CLAIM_REQUIRED.has(category);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (id) await updateLegacyItemAction(id, formData);
        else {
          await createLegacyItemAction(formData);
          formRef.current?.reset();
        }
        toast.success("Tersimpan");
        onDone?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <input type="hidden" name="category" value={category} />

      <div className="space-y-1.5">
        <Label>Kategori</Label>
        <div role="group" aria-label="Kategori" className="flex flex-wrap gap-2">
          {LEGACY_CATEGORIES.map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={category === c ? "default" : "outline"}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABEL[c]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lg-title">Judul</Label>
        <Input
          id="lg-title"
          name="title"
          required
          defaultValue={defaultContent?.title}
          placeholder="Mis. Rekening BRI, Sertifikat tanah Cibinong"
          className="h-11 md:h-8"
        />
      </div>

      {FIELDS.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={`lg-${f.name}`}>{f.label}</Label>
          <Input
            id={`lg-${f.name}`}
            name={f.name}
            defaultValue={defaultContent?.[f.name] ?? ""}
            placeholder={f.hint}
            className="h-11 md:h-8"
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <Label htmlFor="lg-accessNote">Cara akses</Label>
        <Textarea
          id="lg-accessNote"
          name="accessNote"
          rows={2}
          defaultValue={defaultContent?.accessNote}
          placeholder="Lewat aplikasi apa, PIN disimpan di mana — bukan passwordnya langsung"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lg-claimSteps">
          Langkah klaim {claimRequired ? <span className="text-destructive">*</span> : "(opsional)"}
        </Label>
        {/* Pertanyaan pemandu, bukan kolom kosong. Tanpa ini yang tertulis
            biasanya "hubungi bank", dan itu tidak menolong siapa pun. */}
        <p className="text-xs text-muted-foreground">{CLAIM_HINT}</p>
        <Textarea
          id="lg-claimSteps"
          name="claimSteps"
          rows={4}
          required={claimRequired}
          defaultValue={defaultContent?.claimSteps}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lg-detail">Catatan lain</Label>
        <Textarea
          id="lg-detail"
          name="detail"
          rows={2}
          defaultValue={defaultContent?.detail}
        />
      </div>

      <Button type="submit" size="touch" className="w-full md:w-auto" disabled={pending}>
        {pending ? "Menyimpan…" : id ? "Simpan perubahan" : "Tambah item"}
      </Button>
    </form>
  );
}
