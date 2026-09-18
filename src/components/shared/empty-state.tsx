import { Card, CardContent } from "@/components/ui/card";

/**
 * Kartu "belum ada isinya" yang dipakai lintas modul (task, habit, timeline,
 * search, trash, feed entry).
 *
 * Tinggal di `shared/`, bukan di dalam entry-list.tsx seperti dulu: halaman
 * Task tidak seharusnya mengimpor dari modul `entries/` hanya untuk sebuah
 * kartu kosong generik.
 *
 * Teksnya sengaja diserahkan ke pemanggil — kalimat yang berguna selalu
 * menyebut langkah berikutnya, dan langkah itu berbeda di tiap halaman.
 */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
