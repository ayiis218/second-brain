import { ImageResponse } from "next/og";

// Ikon di-generate saat build, bukan disimpan sebagai berkas PNG: satu
// sumber kebenaran untuk warna brand, dan tidak ada aset biner di repo.
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
          // Gradasi brand ColorHunt, sama dengan .bg-brand-gradient.
          background: "linear-gradient(135deg, #3368A0, #66A3BF 55%, #C8DFDB)",
          color: "#FFFFFF",
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        SB
      </div>
    ),
    size,
  );
}
