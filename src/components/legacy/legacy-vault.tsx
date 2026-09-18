"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Plus, Trash2 } from "lucide-react";

import { useAsyncAction } from "@/hooks/use-async-action";
import { deleteLegacyItemAction } from "@/lib/legacy/actions";
import { CATEGORY_LABEL, type LegacyContent } from "@/lib/legacy/schemas";
import { LegacyForm } from "./legacy-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type VaultItem = {
  id: string;
  category: string;
  content: LegacyContent;
  incomplete: boolean;
};

function ItemCard({ item }: { item: VaultItem }) {
  const [editing, setEditing] = useState(false);
  const { pending, run } = useAsyncAction();

  function onDelete() {
    run(() => deleteLegacyItemAction(item.id), {
      success: "Dihapus",
      error: "Gagal menghapus",
    });
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="p-4">
          <LegacyForm
            id={item.id}
            defaultCategory={item.category}
            defaultContent={item.content}
            onDone={() => setEditing(false)}
          />
          <Button
            type="button"
            size="touch"
            variant="ghost"
            className="mt-2 w-full md:w-auto"
            onClick={() => setEditing(false)}
          >
            Batal
          </Button>
        </CardContent>
      </Card>
    );
  }

  const rows: [string, string][] = [
    ["Lembaga", item.content.institution],
    ["Nomor", item.content.identifier],
    ["Lokasi", item.content.location],
    ["Cara akses", item.content.accessNote],
    ["Langkah klaim", item.content.claimSteps],
    ["Kontak", [item.content.contactName, item.content.contactPhone].filter(Boolean).join(" · ")],
    ["Catatan", item.content.detail],
  ];

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 font-medium">{item.content.title}</h3>
          {item.incomplete ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" aria-hidden />
              belum ada langkah klaim
            </Badge>
          ) : null}
        </div>

        <dl className="space-y-1 text-sm">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <dt className="shrink-0 text-muted-foreground sm:w-32">{label}</dt>
                <dd className="whitespace-pre-wrap">{value}</dd>
              </div>
            ))}
        </dl>

        <div className="flex gap-2 pt-1">
          <Button type="button" size="touch" variant="outline" className="flex-1" onClick={() => setEditing(true)}>
            Ubah
          </Button>
          <Button
            type="button"
            size="icon-touch"
            variant="outline"
            aria-label="Hapus item"
            disabled={pending}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LegacyVault({
  counts,
  itemsByCategory,
}: {
  counts: Record<string, number>;
  itemsByCategory: Record<string, VaultItem[]>;
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {adding ? (
        <Card>
          <CardContent className="p-4">
            <LegacyForm onDone={() => setAdding(false)} />
            <Button
              type="button"
              size="touch"
              variant="ghost"
              className="mt-2 w-full md:w-auto"
              onClick={() => setAdding(false)}
            >
              Batal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button type="button" size="touch" className="w-full" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          Tambah item
        </Button>
      )}

      {Object.entries(CATEGORY_LABEL).map(([key, label]) => {
        const count = counts[key] ?? 0;
        const isOpen = openCategory === key;
        const items = itemsByCategory[key] ?? [];

        return (
          <div key={key} className="space-y-2">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenCategory(isOpen ? null : key)}
              className="flex w-full items-center gap-2 rounded-lg border p-3 text-left"
            >
              <span className="flex-1 font-medium">{label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
              <ChevronDown
                className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {isOpen ? (
              items.length === 0 ? (
                <p className="px-3 pb-2 text-sm text-muted-foreground">Belum ada isinya.</p>
              ) : (
                <div className="space-y-2 pl-2">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
