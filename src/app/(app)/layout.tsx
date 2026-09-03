import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ComposeSheet } from "@/components/compose-sheet";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Sticky supaya identitas halaman tetap terlihat saat scroll panjang
            di layar kecil. pt-safe menjaga judul lolos dari notch. */}
        <header className="bg-brand-soft sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="hidden md:inline-flex" />
          <Separator orientation="vertical" className="hidden h-4 md:block" />
          <span className="text-sm font-semibold text-foreground">Second Brain</span>
        </header>

        {/* pb-32 memberi ruang untuk bottom nav (4rem) + FAB di mobile. */}
        <main className="flex-1 p-4 pb-32 md:p-6 md:pb-6">{children}</main>

        <ComposeSheet />
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
