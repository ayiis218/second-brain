import Link from "next/link";
import { Settings } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { isOwner } from "@/lib/auth-user";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Hanya boolean yang menyeberang ke komponen klien. NAV_ITEMS memuat
  // komponen ikon yang tidak bisa diserialisasi, jadi penyaringannya
  // dilakukan di sisi klien.
  //
  // Menyembunyikan menu di sini BUKAN kontrol akses — NAV_ITEMS ikut
  // ke bundle klien untuk semua orang. Halaman khusus pemilik wajib
  // memeriksa isOwner() sendiri di server.
  const owner = await isOwner();

  return (
    <SidebarProvider>
      <AppSidebar isOwner={owner} />
      <SidebarInset>
        {/* Sticky supaya identitas halaman tetap terlihat saat scroll panjang
            di layar kecil. pt-safe menjaga judul lolos dari notch. */}
        <header className="bg-brand-soft sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          {/* Di mobile tombol ini membuka sidebar sebagai sheet — satu-satunya
              jalan ke menu yang tidak muat di bottom nav (Search, Timeline,
              Insight, Finance). */}
          <SidebarTrigger />
          <Separator orientation="vertical" className="hidden h-4 md:block" />
          <span className="text-sm font-semibold text-foreground">Second Brain</span>

          {/* Pintasan langsung; Pengaturan juga ada di dalam sheet menu,
              tapi keluar dan kelola undangan cukup sering dibuka untuk
              layak satu ketukan. */}
          <Button
            size="icon-touch"
            variant="ghost"
            className="ml-auto"
            aria-label="Settings"
            render={<Link href="/settings" />}
          >
            <Settings className="size-5" aria-hidden />
          </Button>
        </header>

        {/* pb-28 memberi ruang untuk bottom nav (4rem) + tombol tulis yang
            menyembul di atasnya. */}
        <main className="flex-1 p-4 pb-28 md:p-6 md:pb-6">{children}</main>

        <BottomNav isOwner={owner} />
      </SidebarInset>
    </SidebarProvider>
  );
}
