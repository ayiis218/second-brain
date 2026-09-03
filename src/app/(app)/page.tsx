import { EntryList } from "@/components/entry-list";
import { QuickCapture } from "@/components/quick-capture";
import { listEntries } from "@/lib/entries/repository";

// Selalu baca data terbaru per request; tidak ada yang berguna untuk di-prerender.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const entries = await listEntries({ limit: 50 });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <QuickCapture />
      <h2 className="px-1 text-sm font-medium text-muted-foreground">Entry terakhir</h2>
      <EntryList entries={entries} />
    </div>
  );
}
