import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /**
       * Diisi callback `session` di src/auth.ts dari `token.sub`.
       * Tanpa ini tidak ada apa pun yang bisa dipakai memfilter data per user.
       */
      id: string;
      /**
       * Waktu terbit token (detik, dari `token.iat`). Dibandingkan dengan
       * `User.sessionsValidAfter` untuk mencabut sesi perangkat yang hilang.
       */
      issuedAt?: number;
    } & DefaultSession["user"];
  }
}
