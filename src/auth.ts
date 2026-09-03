import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ user }) {
      if (!ALLOWED_EMAIL) return true;
      const allowed = user.email === ALLOWED_EMAIL;
      if (!allowed) {
        console.warn(`[auth] Rejected sign-in from non-allowed email: ${user.email}`);
      }
      return allowed;
    },
  },
  pages: {
    signIn: "/login",
  },
});
