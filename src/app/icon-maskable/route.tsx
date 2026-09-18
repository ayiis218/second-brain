import { ImageResponse } from "next/og";

import { BRAND_GRADIENT, BRAND_MARK_DATA_URI, markWidth } from "@/lib/brand-mark";

/**
 * Ikon `purpose: maskable` untuk Android.
 *
 * Bukan `icon.tsx` bernomor: berkas ikon bernomor ikut dipasang sebagai
 * <link rel="icon"> di <head>, dan versi berpadding ini akan terlihat kekecilan
 * di tab browser. Sebagai route handler ia hanya dipakai oleh manifest.
 *
 * Android memotong ikon maskable jadi lingkaran/squircle dan hanya menjamin
 * 80% bagian tengah ikut terlihat, jadi gambarnya diberi ruang aman ekstra —
 * kalau dipaksa sebesar `icon`, cabang simpul di kanan yang kena potong.
 */
const SIZE = 512;

// Tanpa ini, route handler GET dijalankan per request. Ikonnya tidak pernah
// berubah antar request, jadi cukup dirender sekali saat build.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_GRADIENT,
        }}
      >
        {/* next/image tidak berlaku di sini: ini dirender satori jadi PNG,
            bukan DOM browser. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_MARK_DATA_URI}
          alt=""
          width={markWidth(SIZE, 0.46)}
          height={markWidth(SIZE, 0.46)}
        />
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
