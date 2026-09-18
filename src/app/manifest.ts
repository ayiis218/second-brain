import type { MetadataRoute } from "next";

/**
 * PWA manifest (Fase 4).
 *
 * `share_target` memakai method GET: browser cukup membuka `/share` dengan
 * teks yang dibagikan sebagai query param. Varian POST butuh service worker
 * untuk menangkap request-nya, dan itu biaya perawatan yang tidak sepadan
 * untuk menyalin sepotong teks.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Second Brain",
    short_name: "Second Brain",
    description: "Life OS personal — journal, task, habit, notes, timeline.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F9FC",
    theme_color: "#F5F9FC",
    categories: ["productivity", "lifestyle"],
    // `any` dan `maskable` sengaja berkas berbeda. Ikon maskable dipotong
    // Android jadi lingkaran/squircle, jadi gambarnya butuh ruang aman ekstra;
    // memakai satu berkas untuk keduanya membuat salah satunya salah — entah
    // terpotong di home screen, atau kekecilan di tempat yang tidak memotong.
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Tidak ada di tipe MetadataRoute.Manifest bawaan Next, tapi sah menurut
    // spesifikasi Web Share Target.
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
