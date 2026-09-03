import type { Metadata, Viewport } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Roboto menyamakan tipografi dengan finance-dashboard.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Life OS personal — journal, task, habit, notes, timeline.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Second Brain" },
};

export const viewport: Viewport = {
  // `cover` membuat halaman memakai seluruh layar termasuk area notch;
  // ruang aman dikembalikan lewat env(safe-area-inset-*) di globals.css.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F9FC" },
    { media: "(prefers-color-scheme: dark)", color: "#071422" },
  ],
  // Zoom sengaja TIDAK dikunci — mengunci maximumScale merusak aksesibilitas.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
