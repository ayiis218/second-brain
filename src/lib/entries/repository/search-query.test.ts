import { describe, expect, it } from "vitest";
import { buildPrefixQuery } from "./search-query";

/**
 * Kasus "zzzz makan" adalah regresi sejarah nyata (lihat komentar di
 * buildPrefixQuery): versi lama meng-OR awalan kata terakhir dengan query
 * utama, sehingga cabang 'makan:*' cocok sendirian dan kata-kata sebelumnya
 * diabaikan sama sekali. Test ini ada supaya bug yang sama tidak bisa lolos
 * lagi tanpa ketahuan.
 */
describe("buildPrefixQuery", () => {
  it("satu kata jadi awalan", () => {
    expect(buildPrefixQuery("kambi")).toBe("kambi:*");
  });

  it("multi-kata: hanya kata TERAKHIR yang jadi awalan, sisanya AND biasa", () => {
    expect(buildPrefixQuery("zzzz makan")).toBe("zzzz & makan:*");
  });

  it("tiga kata — urutan AND dipertahankan", () => {
    expect(buildPrefixQuery("lari pagi ming")).toBe("lari & pagi & ming:*");
  });

  it("query dengan tanda kutip diserahkan mentah (null), bukan dipaksa jadi awalan", () => {
    expect(buildPrefixQuery('"frasa persis"')).toBeNull();
  });

  it("query dengan operator (-kata) diserahkan mentah (null)", () => {
    expect(buildPrefixQuery("makan -malam")).toBeNull();
  });

  it("string kosong setelah trim menghasilkan null", () => {
    expect(buildPrefixQuery("")).toBeNull();
  });
});
