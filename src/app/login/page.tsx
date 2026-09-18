import { BrainCircuit } from "lucide-react";

import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGE: Record<string, string> = {
  invite_required:
    "Pendaftaran hanya lewat undangan. Minta tautan undangan kepada pemilik ruang ini.",
  invite_invalid:
    "Undangan sudah dipakai, dicabut, kedaluwarsa, atau ditujukan untuk email lain.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERROR_MESSAGE[error] : undefined;

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm overflow-hidden pt-0">
        {/* Satu-satunya tempat gradasi penuh dipakai sebagai bidang besar:
            tidak ada teks kecil di atasnya, hanya ikon. */}
        <div className="bg-brand-gradient flex h-24 items-center justify-center">
          <BrainCircuit className="size-10 text-white" aria-hidden />
        </div>
        <CardHeader>
          <CardTitle>Second Brain</CardTitle>
          <CardDescription>
            Aplikasi personal. Hanya satu akun yang diizinkan masuk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {message ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {message}
            </p>
          ) : null}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button type="submit" size="touch" className="w-full">
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
