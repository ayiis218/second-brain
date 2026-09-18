import { cn } from "@/lib/utils";

/**
 * Satu baris "label di kiri, angka di kanan" dengan garis pemisah.
 *
 * Dipakai daftar statistik Insight dan tabel posisi Finance — dua tempat yang
 * sebelumnya punya komponen lokal masing-masing dengan className identik,
 * sehingga penyesuaian di satu tempat diam-diam membuat keduanya beda.
 */
export function StatRow({
  label,
  value,
  muted = false,
  trailing,
}: {
  label: string;
  value: string;
  /** Untuk angka yang bukan fokus baris — mis. utang yang sudah dihitung sebagai pengurang. */
  muted?: boolean;
  /** Ditempel di kanan angka, sebaris. Dipakai Insight untuk selisih antar-periode. */
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className={cn("font-medium tabular-nums", muted && "text-muted-foreground")}>
          {value}
        </span>
        {trailing}
      </span>
    </div>
  );
}
