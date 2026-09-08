import { describe, expect, it } from "vitest";
import {
  INSTALLMENTS_MIN_CENTS,
  installmentFeeApproxPct,
  installmentFeeLabel,
  installmentsEligible,
} from "./installments";

describe("installmentsEligible", () => {
  const base = { serviceType: "pack", priceCents: 12_000, coachEnabled: true };

  it("accepte un pack d'au moins 120 € quand le coach a activé l'option", () => {
    expect(installmentsEligible(base)).toBe(true);
    expect(installmentsEligible({ ...base, priceCents: INSTALLMENTS_MIN_CENTS })).toBe(true);
  });

  it("refuse en deçà de 120 €, hors packs, ou sans activation", () => {
    expect(installmentsEligible({ ...base, priceCents: 11_999 })).toBe(false);
    expect(installmentsEligible({ ...base, serviceType: "session" })).toBe(false);
    expect(installmentsEligible({ ...base, serviceType: "subscription" })).toBe(false);
    expect(installmentsEligible({ ...base, coachEnabled: false })).toBe(false);
    expect(installmentsEligible({ ...base, coachEnabled: null })).toBe(false);
    expect(installmentsEligible({ ...base, priceCents: null })).toBe(false);
  });
});

describe("frais du paiement fractionné", () => {
  it("affiche la grille Stripe France Klarna", () => {
    expect(installmentFeeLabel("fr")).toMatch(/4,99\s?%/);
    expect(installmentFeeLabel("fr")).toMatch(/0,45/);
    expect(installmentFeeLabel("en")).toMatch(/4\.99%/);
  });

  it("approche 5 % au seuil de 120 €", () => {
    expect(installmentFeeApproxPct()).toBe(5);
    expect(installmentFeeApproxPct(50_000)).toBe(5);
  });
});
