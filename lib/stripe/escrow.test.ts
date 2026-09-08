import { describe, expect, it } from "vitest";
import { coachBearsStripeFee, computePayout } from "./escrow";

describe("computePayout", () => {
  it("Essentiel : 5 % pour Madger, frais Stripe non déduits du coach", () => {
    const r = computePayout({ amountCents: 5_000, feeRateBps: 500, stripeFeeCents: 100 });
    expect(r).toEqual({
      refundCents: 0,
      stripeFeeCents: 100,
      commissionCents: 250,
      providerFeeCents: 0,
      payoutCents: 4_750,
    });
  });

  it("Pro : 3 %", () => {
    const r = computePayout({ amountCents: 5_000, feeRateBps: 300, stripeFeeCents: 100 });
    expect(r.commissionCents).toBe(150);
    expect(r.payoutCents).toBe(4_850);
  });

  it("Studio : 0 % Madger, Stripe toujours porté par Madger sauf paiement fractionné", () => {
    const r = computePayout({ amountCents: 5_000, feeRateBps: 0, stripeFeeCents: 100 });
    expect(r.commissionCents).toBe(0);
    expect(r.payoutCents).toBe(5_000);
  });

  it("commission calculée sur le montant conservé après remboursement partiel", () => {
    const r = computePayout({ amountCents: 10_000, feeRateBps: 500, stripeFeeCents: 175, refundCents: 2_500 });
    expect(r.refundCents).toBe(2_500);
    expect(r.commissionCents).toBe(375); // 5 % de 7 500
    expect(r.payoutCents).toBe(7_125);
    // Invariant : prix = remboursement + commission + versement.
    expect(r.refundCents + r.commissionCents + r.providerFeeCents + r.payoutCents).toBe(10_000);
  });

  it("remboursement intégral : rien pour Madger, rien pour le coach", () => {
    const r = computePayout({ amountCents: 10_000, feeRateBps: 500, stripeFeeCents: 175, refundCents: 10_000 });
    expect(r.commissionCents).toBe(0);
    expect(r.payoutCents).toBe(0);
  });

  it("paiement en 3 fois : les frais du prestataire suivent le montant conservé, à la charge du coach", () => {
    const r = computePayout({
      amountCents: 12_000,
      feeRateBps: 500,
      stripeFeeCents: 644, // 4,99 % + 0,45 €
      coachBearsStripeFee: true,
      refundCents: 6_000,
    });
    expect(r.providerFeeCents).toBe(322);
    expect(r.commissionCents).toBe(300);
    expect(r.payoutCents).toBe(5_378);
    expect(r.refundCents + r.commissionCents + r.providerFeeCents + r.payoutCents).toBe(12_000);
  });

  it("ne produit jamais de valeurs négatives sur des entrées incohérentes", () => {
    const r = computePayout({ amountCents: -5, feeRateBps: -100, stripeFeeCents: -3, refundCents: 99 });
    expect(r.refundCents).toBe(0);
    expect(r.commissionCents).toBe(0);
    expect(r.stripeFeeCents).toBe(0);
    expect(r.payoutCents).toBe(0);
    const r2 = computePayout({ amountCents: 1_000, feeRateBps: 500, stripeFeeCents: 0, refundCents: 5_000 });
    expect(r2.refundCents).toBe(1_000);
    expect(r2.payoutCents).toBe(0);
  });

  it("arrondit la commission au centime le plus proche", () => {
    expect(computePayout({ amountCents: 4_999, feeRateBps: 300, stripeFeeCents: 0 }).commissionCents).toBe(150); // 149,97
    expect(computePayout({ amountCents: 1_001, feeRateBps: 500, stripeFeeCents: 0 }).commissionCents).toBe(50); // 50,05
  });
});

describe("coachBearsStripeFee", () => {
  it("seuls Klarna et Alma sont à la charge du coach", () => {
    expect(coachBearsStripeFee("klarna")).toBe(true);
    expect(coachBearsStripeFee("alma")).toBe(true);
    expect(coachBearsStripeFee("card")).toBe(false);
    expect(coachBearsStripeFee("link")).toBe(false);
    expect(coachBearsStripeFee(null)).toBe(false);
    expect(coachBearsStripeFee(undefined)).toBe(false);
  });
});
