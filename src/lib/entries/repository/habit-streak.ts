/**
 * Logic murni perhitungan streak habit — sengaja TANPA satu pun impor
 * Next.js/Prisma/next-auth. `habits.ts` tetap pemilik query database;
 * berkas ini cuma angka.
 *
 * Pemisahan ini bukan gaya — tanpanya, test (habit-streak.test.ts) ikut
 * menyeret rantai impor next-auth lewat habits.ts -> @/lib/db ->
 * @/lib/auth-user -> @/auth, yang gagal di-resolve Vitest (lingkungan
 * Node/Vite biasa, bukan runtime Next). Berkas tanpa impor framework bisa
 * diuji di mana saja tanpa mock apa pun.
 *
 * Streak = jumlah hari berurutan sampai hari ini.
 *
 * Hari ini yang belum dicentang TIDAK memutus streak — kalau begitu, streak
 * akan terlihat nol setiap pagi sebelum kebiasaannya dikerjakan. Hitungannya
 * dimulai dari hari ini kalau sudah dicentang, kalau belum dari kemarin.
 */
export function computeStreak(done: ReadonlySet<string>, todayKey: string): number {
  const cursor = new Date(`${todayKey}T00:00:00Z`);
  if (!done.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!done.has(key)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
