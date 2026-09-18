"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ComposeSheet } from "@/components/compose-sheet";
import { mobileNavItems } from "@/components/nav-items";
import { cn } from "@/lib/utils";

/**
 * Navigasi utama di mobile. Bottom bar dipilih ketimbang drawer karena
 * navigasi di sini sering dipakai dan harus terjangkau ibu jari — drawer
 * menuntut dua ketukan dan jangkauan ke pojok atas layar.
 *
 * Slot tengah bukan menu, melainkan tombol tulis: aksi yang paling sering
 * dipakai mendapat titik paling mudah dijangkau sekaligus paling menonjol.
 * Sebelumnya tombol itu mengambang di pojok kanan bawah — terjangkau, tapi
 * menutupi isi daftar dan tidak terbaca sebagai bagian dari navigasi.
 *
 * Sidebar mengambil alih di >= md.
 */
export function BottomNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const items = mobileNavItems(isOwner);

  // Dibelah tepat di tengah supaya tombol tulis duduk di sumbu layar; dengan
  // jumlah item ganjil salah satu sisi akan lebih berat dan tombolnya
  // bergeser dari tengah.
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);

  const renderItem = (item: (typeof items)[number]) => {
    const active = pathname === item.href;
    return (
      <li key={item.href} className="flex-1">
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-full flex-col items-center justify-center gap-1 text-xs transition-colors",
            active ? "text-primary" : "text-muted-foreground",
          )}
        >
          <item.icon className="size-5" aria-hidden />
          <span className={cn(active && "font-medium")}>{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden"
    >
      <ul className="flex h-16 items-stretch">
        {left.map(renderItem)}
        <li className="flex-1">
          <ComposeSheet />
        </li>
        {right.map(renderItem)}
      </ul>
    </nav>
  );
}
