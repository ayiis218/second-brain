import { EntryFeed } from "@/components/entry-feed";
import { QuickCapture } from "@/components/quick-capture";
import { TodaySummary } from "@/components/today-summary";
import { listEntries } from "@/lib/entries/repository";

// Selalu baca data terbaru per request; tidak ada yang berguna untuk di-prerender.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { entries, nextCursor } = await listEntries({ limit: 20 });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <TodaySummary />
      <QuickCapture />
      <h2 className="px-1 text-sm font-medium text-muted-foreground">Entry terakhir</h2>
      <EntryFeed
        initialEntries={entries}
        initialCursor={nextCursor}
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
