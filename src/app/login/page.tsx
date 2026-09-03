import { BrainCircuit } from "lucide-react";

import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
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
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button type="submit" size="touch" className="w-full">
              Masuk dengan Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
