import { describe, expect, it } from "vitest";
import { computeStreak } from "./habit-streak";

/**
 * Streak = jumlah hari berurutan sampai hari ini. Kasus yang paling mudah
 * salah (dan paling mahal kalau salah — pengguna melihat streak-nya nol
 * padahal belum kehilangan apa-apa): hari ini yang BELUM dicentang tidak
 * boleh memutus streak kemarin, karena harinya belum selesai.
 */
describe("computeStreak", () => {
  it("menghitung 0 kalau belum pernah dicentang sama sekali", () => {
    expect(computeStreak(new Set(), "2026-10-08")).toBe(0);
  });

  it("menghitung dari hari ini kalau hari ini sudah dicentang", () => {
    const done = new Set(["2026-10-08", "2026-10-07", "2026-10-06"]);
    expect(computeStreak(done, "2026-10-08")).toBe(3);
  });

  it("hari ini belum dicentang TIDAK memutus streak kemarin", () => {
    const done = new Set(["2026-10-07", "2026-10-06", "2026-10-05"]);
    // "2026-10-08" (hari ini) sengaja tidak ada di `done` — streak harus
    // tetap dihitung dari kemarin, bukan jatuh ke 0.
    expect(computeStreak(done, "2026-10-08")).toBe(3);
  });

  it("streak terputus kalau ada satu hari bolong di tengah", () => {
    const done = new Set(["2026-10-08", "2026-10-07", "2026-10-05"]); // 06 bolong
    expect(computeStreak(done, "2026-10-08")).toBe(2);
  });

  it("melewati batas bulan dengan benar (UTC, bukan kalender lokal)", () => {
    const done = new Set(["2026-11-01", "2026-10-31", "2026-10-30"]);
    expect(computeStreak(done, "2026-11-01")).toBe(3);
  });
});
