import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <BrainCircuit className="size-8 text-primary" aria-hidden />
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
            <Button type="submit" className="w-full">
              Masuk dengan Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
