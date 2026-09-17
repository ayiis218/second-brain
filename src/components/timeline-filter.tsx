"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

const FILTERS = [
  { value: "", label: "Semua" },
  { value: "note", label: "Catatan" },
  { value: "journal", label: "Journal" },
  { value: "task", label: "Task" },
  { value: "habit", label: "Habit" },
  { value: "transaction", label: "Transaksi" },
] as const;

/**
 * Timeline memang tempatnya semua tipe entry, kronologis. Tapi hasil sync
 * tumbuh jauh lebih cepat daripada catatan buatan tangan, jadi tanpa filter
 * ia punya masalah yang sama dengan beranda: satu tipe menenggelamkan
 * sisanya.
 */
export function TimelineFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("type") ?? "";

  function pick(value: string) {
    const next = new URLSearchParams();
    if (value) next.set("type", value);
    router.replace(next.size ? `/timeline?${next}` : "/timeline", { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <Button
          key={filter.value || "all"}
          type="button"
          size="sm"
          variant={active === filter.value ? "default" : "outline"}
          onClick={() => pick(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
