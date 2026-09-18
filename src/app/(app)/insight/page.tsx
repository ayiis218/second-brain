import { Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildInsight, loadInsightData, type PeriodStats } from "@/lib/insight";

export const dynamic = "force-dynamic";

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Perbandingan ditampilkan sebagai selisih apa adanya, tanpa kata seperti
 * "membaik" atau "karena" — rencana induk §11.4 melarang menyajikan angka
 * deskriptif seolah temuan sebab-akibat.
 */
function Delta({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null || previous === 0) return null;

  const diff = ((current - previous) / previous) * 100;
  if (!Number.isFinite(diff) || Math.abs(diff) < 1) return null;

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {diff > 0 ? "+" : ""}
      {diff.toFixed(0)}%
    </span>
  );
}

function Stat({
  label,
  value,
  current,
  previous,
}: {
  label: string;
  value: string;
  current?: number | null;
  previous?: number | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="font-medium tabular-nums">{value}</span>
        <Delta current={current ?? null} previous={previous ?? null} />
      </span>
    </div>
  );
}

function StatList({ current, previous }: { current: PeriodStats; previous: PeriodStats }) {
  return (
    <div>
      <Stat
        label="Entries written"
        value={String(current.entries)}
        current={current.entries}
        previous={previous.entries}
      />
      <Stat
        label="Journals"
        value={String(current.journals)}
        current={current.journals}
        previous={previous.journals}
      />
      <Stat
        label="Days with mood ≥ 4"
        value={current.moodDays ? `${current.goodMoodDays} dari ${current.moodDays}` : "—"}
        current={current.goodMoodDays}
        previous={previous.goodMoodDays}
      />
      <Stat
        label="Average mood"
        value={current.moodAverage ? current.moodAverage.toFixed(1) : "—"}
        current={current.moodAverage}
        previous={previous.moodAverage}
      />
      <Stat
        label="Tasks done"
        value={String(current.tasksDone)}
        current={current.tasksDone}
        previous={previous.tasksDone}
      />
      <Stat
        label="Habit checks"
        value={String(current.habitChecks)}
        current={current.habitChecks}
        previous={previous.habitChecks}
      />
      <Stat
        label="Spending"
        value={current.spending === null ? "—" : formatIdr(current.spending)}
        current={current.spending}
        previous={previous.spending}
      />
    </div>
  );
}

export default async function InsightPage() {
  // Satu pengambilan data untuk kedua periode — sebelumnya tiap periode
  // menarik ulang seluruh entry dan habit, jadi halaman ini menjalankan
  // query yang sama dua kali.
  const data = await loadInsightData(60);
  const week = buildInsight(data, 7);
  const month = buildInsight(data, 30);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="px-1 text-lg font-semibold">Insight</h1>

      <Card>
        <CardHeader>
          <CardTitle>Last 7 days</CardTitle>
          <CardDescription>Dibandingkan dengan 7 hari sebelumnya.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatList current={week.current} previous={week.previous} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last 30 days</CardTitle>
          <CardDescription>Dibandingkan dengan 30 hari sebelumnya.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatList current={month.current} previous={month.previous} />
        </CardContent>
      </Card>

      {week.habitStreaks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Streaks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {week.habitStreaks.map((habit) => (
              <Badge key={habit.name} variant="secondary" className="gap-1">
                <Flame className="size-3" aria-hidden />
                {habit.name} · {habit.streak}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <p className="px-1 text-xs text-muted-foreground">
        Angka di atas deskriptif — hitungan dan perbandingan periode, bukan sebab-akibat.
        Pada data harian sebanyak ini, pola yang terlihat sebagian besar kebetulan.
      </p>
    </div>
  );
}
