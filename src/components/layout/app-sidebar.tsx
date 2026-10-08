"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { visibleNavItems, type NavAccess } from "@/components/layout/nav-items";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ nav }: { nav: NavAccess }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  // Daftar menu dirakit di sini, bukan diterima sebagai prop: NavItem
  // memuat komponen ikon, dan komponen tidak bisa diserialisasi dari
  // Server Component ke Client Component.
  const items = visibleNavItems(nav);

  // Di mobile, sidebar adalah Sheet yang menutupi seluruh layar — menekan
  // satu menu harus langsung menutupnya juga, bukan cuma berpindah halaman
  // di baliknya. Next.js App Router berpindah tanpa full reload, jadi
  // tanpa ini Sheet-nya tidak pernah tahu navigasi sudah terjadi.
  //
  // Dibatasi `isMobile`: di desktop sidebar-nya statis (bukan Sheet), jadi
  // tidak boleh ada perilaku baru yang tidak diminta di sana.
  function closeOnMobile() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        {/* bg-brand-soft, bukan bg-brand-gradient: ujung terang gradasi penuh
            tidak cukup kontras untuk teks kecil. */}
        <div className="bg-brand-soft rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground">
          {nav.audience === "vault-only" ? "Legacy Vault" : "Second Brain"}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    onClick={closeOnMobile}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
