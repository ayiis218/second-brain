import { EntryFeed } from "@/components/entry-feed";
import { QuickCapture } from "@/components/quick-capture";
import { TodaySummary } from "@/components/today-summary";
import { listEntries } from "@/lib/entries/repository";

// Selalu baca data terbaru per request; tidak ada yang berguna untuk di-prerender.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // nativeOnly: beranda untuk hal yang kamu tulis sendiri. Transaksi hasil
  // sync punya rumahnya sendiri di /finance.
  const { entries, nextCursor } = await listEntries({ limit: 20, nativeOnly: true });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <TodaySummary />
      <QuickCapture />
      <h2 className="px-1 text-sm font-medium text-muted-foreground">Entry terakhir</h2>
      <EntryFeed
        initialEntries={entries}
        initialCursor={nextCursor}
        nativeOnly
        empty={
          <>
            Belum ada entry. Ketuk tombol{" "}
            <span className="font-medium text-foreground">+</span> di kanan bawah untuk menulis.
          </>
        }
      />
    </div>
  );
}
