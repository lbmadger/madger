import { describe, expect, it } from "vitest";
import { clampVatRateBps, splitVat, vatApplies, vatRateLabel } from "./vat";

describe("splitVat", () => {
  it("ventile un TTC à 20 % sans jamais perdre un centime", () => {
    expect(splitVat(6_000, 2000)).toEqual({ htCents: 5_000, vatCents: 1_000 });
    expect(splitVat(5_000, 2000)).toEqual({ htCents: 4_167, vatCents: 833 });
    for (const ttc of [1, 99, 4_999, 12_345, 99_999]) {
      const { htCents, vatCents } = splitVat(ttc, 2000);
      expect(htCents + vatCents).toBe(ttc);
    }
  });

  it("gère les taux réduits", () => {
    expect(splitVat(10_550, 550)).toEqual({ htCents: 10_000, vatCents: 550 });
    expect(splitVat(11_000, 1000)).toEqual({ htCents: 10_000, vatCents: 1_000 });
  });

  it("franchise en base : tout est HT, TVA nulle", () => {
    expect(splitVat(5_000, 0)).toEqual({ htCents: 5_000, vatCents: 0 });
    expect(splitVat(5_000, 1234)).toEqual({ htCents: 5_000, vatCents: 0 }); // taux inconnu → 0
  });
});

describe("vatApplies / clampVatRateBps", () => {
  it("exige un numéro de TVA et un taux non nul", () => {
    expect(vatApplies("FR12345678901", 2000)).toBe(true);
    expect(vatApplies("FR12345678901", 0)).toBe(false);
    expect(vatApplies(null, 2000)).toBe(false);
    expect(vatApplies("  ", 2000)).toBe(false);
  });

  it("n'accepte que les taux français prévus", () => {
    expect(clampVatRateBps(2000)).toBe(2000);
    expect(clampVatRateBps("550")).toBe(550);
    expect(clampVatRateBps(1960)).toBe(0);
    expect(clampVatRateBps(undefined)).toBe(0);
  });

  it("formate le taux", () => {
    const plain = (x: string) => x.replace(/[\u202F\u00A0]/g, " ");
    expect(plain(vatRateLabel(2000))).toBe("20 %");
    expect(plain(vatRateLabel(550))).toBe("5,5 %");
    expect(vatRateLabel(1000, "en")).toBe("10%");
  });
});
