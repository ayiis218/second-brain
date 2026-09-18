"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { QuickCaptureForm } from "@/components/entries/quick-capture-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Tombol tulis + bottom sheet, khusus mobile. Ditanam di slot tengah bottom
 * nav (bottom-nav.tsx), bukan mengambang di pojok kanan bawah seperti dulu.
 *
 * Menulis adalah aksi paling sering di aplikasi ini, jadi ia mendapat titik
 * paling mudah dijangkau ibu jari sekaligus paling menonjol. Versi mengambang
 * memang terjangkau, tapi ia menutupi isi daftar dan terbaca sebagai pelengkap
 * di luar navigasi — bukan sebagai aksi utamanya.
 *
 * Tombolnya diangkat ke atas garis bar (`-translate-y-5`) supaya tingginya,
 * bukan cuma warnanya, yang membedakan dia dari empat menu di kiri-kanan.
 */
export function ComposeSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="relative flex h-full flex-col items-center justify-center">
        <SheetTrigger
          render={
            <Button
              size="icon-touch"
              aria-label="New entry"
              className="bg-brand-gradient size-14 -translate-y-5 rounded-full text-white shadow-lg ring-4 ring-card"
            >
              <Plus className="size-7" aria-hidden />
            </Button>
          }
        />
        {/* Label kecil menjaga ritme dengan menu lain yang semuanya berlabel —
            ikon + sadar diri, bukan tombol misterius. aria-hidden karena
            tombolnya sudah punya aria-label yang lebih lengkap. */}
        <span
          aria-hidden
          className="absolute bottom-1.5 text-[10px] font-medium text-muted-foreground"
        >
          Write
        </span>
      </div>

      <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New entry</SheetTitle>
        </SheetHeader>
        <div className="pb-safe px-4 pb-6">
          <QuickCaptureForm autoFocus onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
