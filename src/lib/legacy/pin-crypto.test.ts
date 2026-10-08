import { describe, expect, it } from "vitest";
import { derive, isLockedOut, nextFailureState } from "./pin-crypto";

describe("derive", () => {
  it("hasil deterministik untuk PIN + salt yang sama", () => {
    const salt = Buffer.from("saltsaltsaltsalt");
    expect(derive("123456", salt).equals(derive("123456", salt))).toBe(true);
  });

  it("PIN berbeda menghasilkan hash berbeda", () => {
    const salt = Buffer.from("saltsaltsaltsalt");
    expect(derive("123456", salt).equals(derive("654321", salt))).toBe(false);
  });

  it("salt berbeda menghasilkan hash berbeda walau PIN sama", () => {
    expect(
      derive("123456", Buffer.from("saltsaltsaltsalt")).equals(
        derive("123456", Buffer.from("beda-beda-beda-x")),
      ),
    ).toBe(false);
  });
});

describe("isLockedOut", () => {
  const now = new Date("2026-10-08T12:00:00Z");

  it("tidak terkunci kalau belum pernah dikunci (null)", () => {
    expect(isLockedOut(null, now)).toBe(false);
  });

  it("terkunci kalau waktu kunci masih di masa depan", () => {
    expect(isLockedOut(new Date("2026-10-08T12:05:00Z"), now)).toBe(true);
  });

  it("tidak lagi terkunci begitu waktu kunci sudah lewat", () => {
    expect(isLockedOut(new Date("2026-10-08T11:59:00Z"), now)).toBe(false);
  });
});

/**
 * Percobaan ke-5 yang harus mengunci, bukan ke-4 atau ke-6 — off-by-one
 * di sini berarti brute force dapat satu percobaan ekstra gratis, atau
 * pengguna sah terkunci lebih cepat dari yang diumumkan ke mereka.
 */
describe("nextFailureState", () => {
  const now = new Date("2026-10-08T12:00:00Z");

  it("percobaan 1-4: menaikkan hitungan, belum mengunci", () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const state = nextFailureState(attempt, now);
      expect(state.attempts).toBe(attempt + 1);
      expect(state.lockedUntil).toBeNull();
    }
  });

  it("percobaan ke-5: mengunci dan mereset hitungan ke 0", () => {
    const state = nextFailureState(4, now);
    expect(state.attempts).toBe(0);
    expect(state.lockedUntil).toEqual(new Date("2026-10-08T12:15:00Z"));
  });
});
