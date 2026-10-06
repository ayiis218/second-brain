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
  /** Hanya tampil untuk pemilik — khusus Finance, yang memang tidak pernah dijual. */
  ownerOnly?: boolean;
  /** Tampil untuk pemilik ATAU siapa pun dengan entitlement vault (lihat lib/legacy/access.ts). */
  requiresVaultAccess?: boolean;
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
  { href: "/legacy", label: "Legacy", icon: ShieldCheck, requiresVaultAccess: true },
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

/**
 * Pelanggan Legacy Vault yang mendaftar lewat /vault hanya melihat produk
 * yang mereka beli — bukan seluruh Second Brain. Daftar ini, bukan daftar
 * MOBILE_HREFS, yang menentukan menu mana yang relevan untuk mereka.
 */
const VAULT_ONLY_HREFS = ["/legacy", "/settings"];

export type NavAccess = {
  isOwner: boolean;
  hasVaultAccess: boolean;
  audience: "full" | "vault-only";
};

export function visibleNavItems(access: NavAccess): NavItem[] {
  const entitled = NAV_ITEMS.filter((item) => {
    if (item.ownerOnly && !access.isOwner) return false;
    if (item.requiresVaultAccess && !access.isOwner && !access.hasVaultAccess) return false;
    return true;
  });

  return access.audience === "vault-only"
    ? entitled.filter((item) => VAULT_ONLY_HREFS.includes(item.href))
    : entitled;
}

export function mobileNavItems(access: NavAccess): NavItem[] {
  return visibleNavItems(access).filter((item) => MOBILE_HREFS.includes(item.href));
}
