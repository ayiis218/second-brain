import { cookies } from "next/headers";
import { BrainCircuit } from "lucide-react";

import { signIn } from "@/auth";
import { INVITE_COOKIE, peekInvite } from "@/lib/invites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: PageProps<"/invite/[code]">) {
  const { code } = await params;
  const invite = await peekInvite(code);

  if (!invite) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Undangan tidak berlaku</CardTitle>
            <CardDescription>
              Tautan ini sudah dipakai, dicabut, atau kedaluwarsa. Minta tautan baru
              kepada yang mengundangmu.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm overflow-hidden pt-0">
        <div className="bg-brand-gradient flex h-24 items-center justify-center">
          <BrainCircuit className="size-10 text-white" aria-hidden />
        </div>
        <CardHeader>
          <CardTitle>Kamu diundang</CardTitle>
          <CardDescription>
            {invite.email
              ? `Undangan ini khusus untuk ${invite.email}. Masuk dengan akun Google tersebut.`
              : "Masuk dengan akun Google-mu untuk membuat ruang Second Brain sendiri."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";

              // Cookie DISET DI SINI, bukan saat halaman dirender: Next hanya
              // mengizinkan penulisan cookie di Server Action atau Route
              // Handler. Menulisnya saat render melempar
              // "Cookies can only be modified in a Server Action or Route Handler".
              //
              // Isinya tetap hanya penanda niat, bukan bukti — callback signIn
              // di src/auth.ts memvalidasi ulang kodenya sebelum user dibuat.
              (await cookies()).set(INVITE_COOKIE, code, {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
                maxAge: 60 * 30,
              });

              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button type="submit" size="touch" className="w-full">
              Lanjut dengan Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
