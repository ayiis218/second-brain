import { cookies } from "next/headers";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { INVITE_COOKIE, attachInviteUser, consumeInvite } from "@/lib/invites";

/**
 * Email pemilik. Bukan lagi pemblokir login seperti di Fase 1 — sekarang
 * penanda peran: hanya pemilik yang melihat modul Legacy dan Finance sync.
 */
export const OWNER_EMAIL = process.env.OWNER_EMAIL?.trim().toLowerCase();

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * Pendaftaran tertutup: hanya pemilik, user yang sudah ada, dan pemegang
     * undangan valid yang boleh masuk.
     */
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      if (OWNER_EMAIL && email === OWNER_EMAIL) return true;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return true;

      // Mulai dari sini: pendaftaran user baru.
      const code = (await cookies()).get(INVITE_COOKIE)?.value;
      if (!code) return "/login?error=invite_required";

      // Validasi ULANG di sisi server. Cookie berasal dari klien dan tidak
      // boleh dipercaya hanya karena halaman /invite sudah mengeceknya.
      const consumed = await consumeInvite(code, email);
      if (!consumed) return "/login?error=invite_invalid";

      return true;
    },

    /**
     * Menyimpan id user dari adapter ke token saat sign-in, eksplisit.
     * Tanpa ini kita bergantung pada `token.sub` diisi benar oleh perilaku
     * bawaan — dan token lama yang isinya bukan id user akan menghasilkan
     * pelanggaran foreign key yang jauh dari penyebabnya.
     */
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },

    /**
     * `token.sub` berisi id user dari adapter. Tanpa callback ini
     * `session.user.id` kosong dan tidak ada yang bisa dipakai memfilter data.
     * Keabsahannya tetap diverifikasi di requireUserId().
     */
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    /**
     * `usedById` baru bisa diisi di sini: saat callback signIn berjalan,
     * adapter belum membuat baris user-nya.
     */
    async createUser({ user }) {
      const jar = await cookies();
      const code = jar.get(INVITE_COOKIE)?.value;
      if (code && user.id) {
        await attachInviteUser(code, user.id);
      }
    },
  },
  pages: {
    signIn: "/login",
  },
});
