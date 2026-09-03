import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay } from "date-fns";

/**
 * Timezone aplikasi dipatok konstan, TIDAK diambil dari browser — supaya
 * batas hari (journal "hari ini", streak habit, grouping timeline) tidak
 * bergeser saat data diakses dari zona waktu lain.
 */
export const APP_TIMEZONE = "Asia/Jakarta";

export const inAppTz = (d: Date | string | number) =>
  new TZDate(d instanceof Date ? d.getTime() : new Date(d).getTime(), APP_TIMEZONE);

/**
 * Rentang UTC untuk satu hari kalender WIB.
 * Semua query "hari ini" harus lewat sini, bukan memanggil startOfDay langsung.
 */
export function dayRange(d: Date = new Date()) {
  const local = inAppTz(d);
  return {
    start: new Date(startOfDay(local).getTime()),
    end: new Date(endOfDay(local).getTime()),
  };
}

/** Kunci tanggal 'YYYY-MM-DD' menurut WIB — untuk grouping & streak. */
export function dayKey(d: Date = new Date()) {
  const local = inAppTz(d);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format tanggal-waktu singkat untuk UI, selalu dalam WIB. */
export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIMEZONE,
  }).format(d);
}
