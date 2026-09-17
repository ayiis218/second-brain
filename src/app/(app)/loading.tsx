import { Skeleton } from "@/components/ui/skeleton";

/**
 * Semua halaman force-dynamic. Di jaringan mobile yang lemah, tanpa berkas
 * ini layar diam tanpa umpan balik selama server render — dan diam terbaca
 * sebagai aplikasi rusak, bukan aplikasi yang sedang bekerja.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <Skeleton className="h-6 w-32" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="ml-auto h-4 w-28" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
