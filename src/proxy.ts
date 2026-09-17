import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

// `api/cron` dikecualikan sejak awal: sync job Fase 3 akan hidup di sana dan
// dipanggil mesin, bukan browser. Tanpa pengecualian ini ia akan menerima
// redirect 307 ke halaman login — persis masalah yang ditemukan di
// finance-dashboard (lihat rencana-perubahan-sync.md, Temuan C).
// `invite` dikecualikan karena halaman itu justru diakses saat belum punya
// sesi — kalau ikut dijaga, penerima undangan hanya akan dilempar ke /login
// tanpa pernah sempat menyerahkan kodenya.
export const config = {
  matcher: ["/((?!api/auth|api/cron|login|invite|_next/static|_next/image|favicon.ico).*)"],
};
