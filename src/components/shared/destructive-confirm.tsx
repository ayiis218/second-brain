"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Aksi merusak dua langkah: tombol biasa dulu, konsekuensinya dibaca, baru
 * tombol merah muncul.
 *
 * Bukan `confirm()` browser dan bukan dialog: keduanya menampilkan pesan yang
 * mudah ditutup refleks. Di sini tombol pemicunya hilang digantikan
 * penjelasan, jadi langkah keduanya tidak bisa dilewati tanpa membaca.
 *
 * Keadaan "sedang mengonfirmasi" dipegang komponen ini sendiri — pemanggil
 * hanya mengurus aksinya. Sebelumnya tiap pemakai menyimpan flag itu di
 * state-nya masing-masing.
 */
export function DestructiveConfirm({
  trigger,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
}: {
  /** Isi tombol pemicu — boleh memuat ikon. */
  trigger: React.ReactNode;
  /** Apa yang akan terjadi, ditulis apa adanya. */
  message: React.ReactNode;
  /** Isi tombol merah. Boleh berubah saat `pending` untuk menandai proses berjalan. */
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  pending?: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        size="touch"
        variant="outline"
        className="w-full text-destructive md:w-auto"
        onClick={() => setConfirming(true)}
      >
        {trigger}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">{message}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="touch"
          variant="destructive"
          className="flex-1"
          disabled={pending}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button
          type="button"
          size="touch"
          variant="outline"
          className="flex-1"
          onClick={() => setConfirming(false)}
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
