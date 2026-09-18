import { ImageResponse } from "next/og";

import { BRAND_GRADIENT, BRAND_MARK_DATA_URI, markWidth } from "@/lib/brand-mark";

// Ikon di-generate saat build, bukan disimpan sebagai berkas PNG: satu
// sumber kebenaran untuk warna brand, dan tidak ada aset biner di repo.
//
// 512 px sekaligus melayani tab browser (diperkecil browser) dan daftar ikon
// di manifest, jadi tidak perlu berkas terpisah per ukuran.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          width={markWidth(size.width, 0.6)}
          height={markWidth(size.height, 0.6)}
        />
      </div>
    ),
    size,
  );
}
