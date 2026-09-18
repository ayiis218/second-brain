import { QuickCaptureForm } from "@/components/entries/quick-capture-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Tulis cepat versi desktop: kartu inline di atas daftar.
 * Di mobile, form yang sama dibuka lewat FAB + bottom sheet (compose-sheet.tsx)
 * supaya daftar entri tidak terdorong turun oleh form yang jarang dipakai
 * sekaligus, dan tombol tulisnya tetap dalam jangkauan ibu jari.
 */
export function QuickCapture() {
  return (
    <Card className="hidden md:block">
      <CardHeader>
        <CardTitle>Quick capture</CardTitle>
      </CardHeader>
      <CardContent>
        <QuickCaptureForm />
      </CardContent>
    </Card>
  );
}
