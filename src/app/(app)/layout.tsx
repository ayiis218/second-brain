import Link from "next/link";
import { Settings } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { NavAccess } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getNavAudience, isOwner } from "@/lib/auth-user";
import { hasVaultAccess } from "@/lib/legacy/access";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Hanya data yang bisa diserialisasi yang menyeberang ke komponen klien.
  // NAV_ITEMS memuat komponen ikon yang tidak bisa diserialisasi, jadi
  // penyaringannya dilakukan di sisi klien dengan `nav` sebagai input.
  //
  // Menyembunyikan menu di sini BUKAN kontrol akses — NAV_ITEMS ikut
  // ke bundle klien untuk semua orang. Halaman khusus pemilik/entitlement
  // wajib memeriksa isOwner()/hasVaultAccess() sendiri di server.
  const [owner, vaultAccess, audience] = await Promise.all([
    isOwner(),
    hasVaultAccess(),
    getNavAudience(),
  ]);
  const nav: NavAccess = { isOwner: owner, hasVaultAccess: vaultAccess, audience };

  return (
    <SidebarProvider>
      <AppSidebar nav={nav} />
      <SidebarInset>
        {/* Sticky supaya identitas halaman tetap terlihat saat scroll panjang
            di layar kecil. pt-safe menjaga judul lolos dari notch. */}
        <header className="bg-brand-soft sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          {/* Di mobile tombol ini membuka sidebar sebagai sheet — satu-satunya
              jalan ke menu yang tidak muat di bottom nav (Search, Timeline,
              Insight, Finance). */}
          <SidebarTrigger />
          <Separator orientation="vertical" className="hidden h-4 md:block" />
          <span className="text-sm font-semibold text-foreground">
            {nav.audience === "vault-only" ? "Legacy Vault" : "Second Brain"}
          </span>

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
            menyembul di atasnya — tidak perlu untuk audience "vault-only",
            tapi mengecilkannya secara kondisional cuma menambah percabangan
            untuk selisih padding yang tidak terasa di halaman yang isinya
            satu panel vault. */}
        <main className="flex-1 p-4 pb-28 md:p-6 md:pb-6">{children}</main>

        <BottomNav nav={nav} />
      </SidebarInset>
    </SidebarProvider>
  );
}
