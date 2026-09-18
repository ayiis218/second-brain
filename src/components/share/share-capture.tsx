"use client";

import { useRouter } from "next/navigation";

import { QuickCaptureForm } from "@/components/entries/quick-capture-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ShareCapture({
  defaultTitle,
  defaultBody,
}: {
  defaultTitle: string;
  defaultBody: string;
}) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>New note</CardTitle>
        <CardDescription>
          Isinya sudah diisi dari aplikasi asal. Ubah seperlunya sebelum disimpan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Setelah tersimpan, pindah ke beranda — membiarkan form terbuka
            dengan isi yang sama mengundang penyimpanan ganda. */}
        <QuickCaptureForm
          defaultTitle={defaultTitle}
          defaultBody={defaultBody}
          onDone={() => router.push("/")}
        />
      </CardContent>
    </Card>
  );
}
