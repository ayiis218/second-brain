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
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
