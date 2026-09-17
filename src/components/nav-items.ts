import {
  BookOpen,
  CalendarClock,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hanya tampil untuk pemilik — mis. Finance sync (Fase 3), Legacy (Fase 5). */
  ownerOnly?: boolean;
};

/** Seluruh menu — dipakai sidebar desktop. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", icon: LayoutDashboard },
  { href: "/task", label: "Task", icon: ListChecks },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/search", label: "Cari", icon: Search },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

/**
 * Bottom nav mobile hanya memuat lima yang paling sering dipakai. Lebih dari
 * itu, tiap target menyempit di bawah lebar ibu jari; Pengaturan tetap
 * terjangkau lewat halaman lain.
 */
const MOBILE_HREFS = ["/", "/task", "/journal", "/search", "/timeline"];

export function visibleNavItems(isOwner: boolean) {
  return NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);
}

export function mobileNavItems(isOwner: boolean) {
  return visibleNavItems(isOwner).filter((item) => MOBILE_HREFS.includes(item.href));
}
