import {
  BookOpen,
  CalendarClock,
  LayoutDashboard,
  Wallet,
  ListChecks,
  Repeat,
  Sparkles,
  Search,
  Settings,
  Trash2,
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
  { href: "/habit", label: "Habit", icon: Repeat },
  { href: "/insight", label: "Insight", icon: Sparkles },
  { href: "/search", label: "Cari", icon: Search },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/finance", label: "Finance", icon: Wallet, ownerOnly: true },
  { href: "/trash", label: "Tempat sampah", icon: Trash2 },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

/**
 * Bottom nav mobile hanya memuat lima yang paling sering dipakai — lebih dari
 * itu, tiap target menyempit di bawah lebar ibu jari.
 *
 * Yang tidak muat TIDAK jadi tidak terjangkau: tombol menu di header membuka
 * sidebar sebagai sheet berisi seluruh menu.
 */
const MOBILE_HREFS = ["/", "/task", "/habit", "/journal", "/search"];

export function visibleNavItems(isOwner: boolean) {
  return NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);
}

export function mobileNavItems(isOwner: boolean) {
  return visibleNavItems(isOwner).filter((item) => MOBILE_HREFS.includes(item.href));
}
