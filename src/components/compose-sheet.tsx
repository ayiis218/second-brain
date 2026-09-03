"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { QuickCaptureForm } from "@/components/quick-capture-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Tombol tulis mengambang + bottom sheet, khusus mobile.
 *
 * Menulis adalah aksi paling sering di aplikasi ini, jadi ia dapat target
 * permanen di area jangkauan ibu jari — bukan form yang harus di-scroll
 * dicari lebih dulu.
 */
export function ComposeSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            size="icon-touch"
            aria-label="Tulis entry baru"
            className="bg-brand-gradient bottom-safe fixed right-4 z-40 mb-4 size-14 rounded-full text-white shadow-lg md:hidden"
          >
            <Plus className="size-6" aria-hidden />
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Tulis entry</SheetTitle>
        </SheetHeader>
        <div className="pb-safe px-4 pb-6">
          <QuickCaptureForm autoFocus onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
