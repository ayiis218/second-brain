"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { visibleNavItems } from "@/components/layout/nav-items";
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
} from "@/components/ui/sidebar";

export function AppSidebar({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  // Daftar menu dirakit di sini, bukan diterima sebagai prop: NavItem
  // memuat komponen ikon, dan komponen tidak bisa diserialisasi dari
  // Server Component ke Client Component.
  const items = visibleNavItems(isOwner);

  return (
    <Sidebar>
      <SidebarHeader>
        {/* bg-brand-soft, bukan bg-brand-gradient: ujung terang gradasi penuh
            tidak cukup kontras untuk teks kecil. */}
        <div className="bg-brand-soft rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground">
          Second Brain
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
