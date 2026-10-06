"use client";

import { useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Download, Paperclip, Plus, Trash2 } from "lucide-react";

import { useAsyncAction } from "@/hooks/use-async-action";
import {
  deleteLegacyAttachmentAction,
  deleteLegacyItemAction,
  MAX_ATTACHMENT_BYTES,
  uploadLegacyAttachmentAction,
} from "@/lib/legacy/actions";
import { CATEGORY_LABEL, type LegacyContent } from "@/lib/legacy/schemas";
import { LegacyForm } from "./legacy-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type AttachmentMeta = {
  id: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export type VaultItem = {
  id: string;
  category: string;
  content: LegacyContent;
  incomplete: boolean;
  attachments: AttachmentMeta[];
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Lampiran per item: daftar yang sudah ada + input tambah baru.
 *
 * Diunduh lewat tautan biasa ke /api/legacy/attachments/[id] (Route Handler,
 * bukan server action) — browser butuh respons dengan Content-Type biner,
 * yang tidak bisa dikirim server action.
 */
function AttachmentList({ itemId, attachments }: { itemId: string; attachments: AttachmentMeta[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useAsyncAction();

  function onUpload(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    run(() => uploadLegacyAttachmentAction(itemId, formData), {
      success: "Lampiran ditambahkan",
      error: "Gagal menambah lampiran",
    });
  }

  function onDelete(attachmentId: string) {
    run(() => deleteLegacyAttachmentAction(attachmentId), {
      success: "Lampiran dihapus",
      error: "Gagal menghapus lampiran",
    });
  }

  return (
    <div className="space-y-1.5 border-t pt-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="size-3.5" aria-hidden />
        Lampiran
      </p>

      {attachments.length > 0 ? (
        <ul className="space-y-1">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
              <a
                href={`/api/legacy/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-1.5 underline-offset-2 hover:underline"
              >
                <Download className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{a.mimeType}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatSize(a.sizeBytes)}</span>
              </a>
              <Button
                type="button"
                size="icon-touch"
                variant="ghost"
                aria-label="Hapus lampiran"
                disabled={pending}
                onClick={() => onDelete(a.id)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="xs"
        variant="outline"
        disabled={pending}
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip className="size-3.5" aria-hidden />
        {pending ? "Mengunggah…" : "Tambah lampiran"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Maks {MAX_ATTACHMENT_BYTES / 1024 / 1024}MB per berkas — foto sertifikat, scan buku tabungan,
        dan sejenisnya. Nama berkasnya sendiri tidak pernah disimpan.
      </p>
    </div>
  );
}

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

        <AttachmentList itemId={item.id} attachments={item.attachments} />
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
