"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Preferensi "tampilkan nominal rupiah" — satu sakelar untuk SELURUH app,
 * bukan per-kartu. Menyembunyikan satu tapi tidak yang lain terasa rusak:
 * transaksi individual yang tetap kelihatan sudah cukup untuk menebak
 * posisi yang disembunyikan.
 *
 * Murni preferensi per-perangkat, bukan data — makanya localStorage, bukan
 * database atau sesi. Default TAMPIL: baru disembunyikan begitu pemiliknya
 * sengaja menekan mata, dan keadaan itu yang diingat sesudahnya.
 *
 * `useSyncExternalStore`, bukan useState+useEffect — pola yang sama dengan
 * useIsMobile() di hooks/use-mobile.ts, karena alasan yang sama: men-set
 * state di dalam effect ditolak aturan react-hooks/set-state-in-effect, dan
 * ini sumber eksternal (localStorage) sungguhan, bukan state React. Tidak
 * ada Provider yang dibutuhkan — tiap pemanggil useBalanceVisibility()
 * langsung baca sumber yang sama.
 */

const STORAGE_KEY = "sb_balance_visible";

// Event `storage` bawaan browser cuma menyala di tab LAIN, bukan tab yang
// menulis — pub/sub kecil ini yang membuat tab yang sama ikut re-render
// begitu toggle() dipanggil di situ.
const listeners = new Set<() => void>();

function readVisibility(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "hidden";
  } catch {
    // Private browsing atau storage diblokir — bukan alasan mematikan
    // fitur, cukup default tampil untuk sesi ini.
    return true;
  }
}

function writeVisibility(visible: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, visible ? "visible" : "hidden");
  } catch {
    // Diam saja — tanpa storage, preferensinya cuma tidak diingat lintas sesi.
  }
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useBalanceVisibility(): { visible: boolean; toggle: () => void } {
  const visible = useSyncExternalStore(
    subscribe,
    readVisibility,
    () => true, // di server, anggap tampil — localStorage tidak ada di sana
  );

  return {
    visible,
    toggle: () => writeVisibility(!readVisibility()),
  };
}

/**
 * Tombol ikon mata, siap ditaruh di mana pun. `stopPropagation` di sini
 * BUKAN hiasan — FinanceSummaryCard membungkus seluruh kartunya dengan
 * <Link>, dan tanpa ini menekan mata ikut menavigasi ke /finance.
 */
export function BalanceVisibilityToggle({ className }: { className?: string }) {
  const { visible, toggle } = useBalanceVisibility();

  return (
    <Button
      type="button"
      size="icon-touch"
      variant="ghost"
      className={className}
      aria-label={visible ? "Sembunyikan nominal" : "Tampilkan nominal"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
    >
      {/* Ikon mencerminkan keadaan SAAT INI, bukan aksi yang akan terjadi —
          konvensi yang sama dipakai hampir semua toggle kata sandi/saldo:
          mata terbuka berarti "sedang terlihat", bukan "klik untuk melihat". */}
      {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
    </Button>
  );
}
