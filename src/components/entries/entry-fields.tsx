"use client";

import { useState } from "react";

import {
  MOOD_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/entries/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type EntryFieldDefaults = {
  mood?: number | null;
  status?: string | null;
  priority?: string | null;
  dueAt?: string | null;
};

/**
 * Skala mood sebagai lima tombol, bukan slider: satu ketukan, target 44px,
 * dan nilainya terbaca tanpa harus menafsirkan posisi.
 */
function MoodField({ defaultValue }: { defaultValue?: number | null }) {
  const [mood, setMood] = useState<number | null>(defaultValue ?? null);

  return (
    <div className="space-y-1.5">
      <Label>Mood</Label>
      <input type="hidden" name="mood" value={mood ?? ""} />
      <div role="group" aria-label="Mood" className="flex gap-2">
        {MOOD_OPTIONS.map((option) => {
          const active = mood === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              aria-label={option.label}
              className={cn("h-11 flex-1 text-lg md:h-9")}
              // Ketuk ulang untuk mengosongkan — mood boleh tidak diisi.
              onClick={() => setMood(active ? null : option.value)}
            >
              {option.emoji}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? options[0].value);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="touch"
            variant={value === option.value ? "default" : "outline"}
            aria-pressed={value === option.value}
            className="flex-1"
            onClick={() => setValue(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Field tambahan yang muncul sesuai tipe entry terpilih. */
export function EntryFields({
  type,
  defaults,
}: {
  type: string;
  defaults?: EntryFieldDefaults;
}) {
  if (type === "journal") {
    return <MoodField defaultValue={defaults?.mood} />;
  }

  if (type === "task") {
    return (
      <div className="space-y-3">
        <ChoiceField
          name="status"
          label="Status"
          options={STATUS_OPTIONS}
          defaultValue={defaults?.status}
        />
        <ChoiceField
          name="priority"
          label="Prioritas"
          options={PRIORITY_OPTIONS}
          defaultValue={defaults?.priority}
        />
        <div className="space-y-1.5">
          <Label htmlFor="dueAt">Jatuh tempo</Label>
          <Input
            id="dueAt"
            name="dueAt"
            type="date"
            defaultValue={defaults?.dueAt ?? ""}
            className="h-11 md:h-8"
          />
        </div>
      </div>
    );
  }

  return null;
}
