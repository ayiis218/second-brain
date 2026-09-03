import { CalendarClock, LayoutDashboard, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Dipakai bersama oleh sidebar (desktop) dan bottom nav (mobile). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
];
