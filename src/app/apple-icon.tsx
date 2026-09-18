import { ImageResponse } from "next/og";

import { BRAND_GRADIENT, BRAND_MARK_DATA_URI, markWidth } from "@/lib/brand-mark";

// Ikon di-generate saat build, bukan disimpan sebagai berkas PNG: satu
// sumber kebenaran untuk warna brand, dan tidak ada aset biner di repo.
//
// iOS memotong sendiri jadi squircle dan TIDAK mengenal `purpose: maskable`,
// jadi gambarnya dibuat sedikit lebih kecil daripada di `icon` agar tidak
// tersenggol lengkung sudut.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <img
          src={BRAND_MARK_DATA_URI}
          alt=""
          width={markWidth(size.width, 0.56)}
          height={markWidth(size.height, 0.56)}
        />
      </div>
    ),
    size,
  );
}
