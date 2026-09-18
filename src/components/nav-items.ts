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
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hanya tampil untuk pemilik — mis. Finance (Fase 3), Legacy (Fase 5). */
  ownerOnly?: boolean;
};

/**
 * Seluruh menu — dipakai sidebar desktop.
 *
 * Nama menu (dan judul halaman yang sepadan) memakai Bahasa Inggris; seluruh
 * kalimat, tombol, dan pesan di luar itu Bahasa Indonesia. Sebelumnya daftar
 * ini campur — "Task" bersebelahan dengan "Tempat sampah" — sehingga pembaca
 * harus menebak apakah keduanya jenis hal yang berbeda.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/task", label: "Task", icon: ListChecks },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/habit", label: "Habit", icon: Repeat },
  { href: "/insight", label: "Insight", icon: Sparkles },
  { href: "/search", label: "Search", icon: Search },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/finance", label: "Finance", icon: Wallet, ownerOnly: true },
  { href: "/legacy", label: "Legacy", icon: ShieldCheck, ownerOnly: true },
  { href: "/trash", label: "Trash", icon: Trash2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Bottom nav mobile memuat empat menu, bukan lima: slot tengah dipakai tombol
 * tulis yang menonjol (lihat bottom-nav.tsx). Menulis adalah aksi paling
 * sering di aplikasi ini, jadi ia yang dapat posisi terbaik — tepat di jalur
 * ibu jari — bukan sekadar menempel di pojok.
 *
 * "Search" yang keluar dari daftar TIDAK jadi tidak terjangkau: tombol menu di
 * header membuka sidebar sebagai sheet berisi seluruh menu.
 */
const MOBILE_HREFS = ["/", "/task", "/journal", "/habit"];

export function visibleNavItems(isOwner: boolean) {
  return NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);
}

export function mobileNavItems(isOwner: boolean) {
  return visibleNavItems(isOwner).filter((item) => MOBILE_HREFS.includes(item.href));
}
