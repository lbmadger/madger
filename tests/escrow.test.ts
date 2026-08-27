import { describe, it, expect } from "vitest";
import { computePayout } from "@/lib/stripe/escrow";

// Répartition de l'argent sous séquestre : c'est le calcul le plus sensible de
// l'app (ce que touche le coach, ce que garde Madger, ce qu'on rembourse).
describe("computePayout", () => {
  it("coach Free : 5 % de commission, frais Stripe portés par le coach", () => {
    // 100,00 € encaissés, 3,20 € de frais Stripe, pas Pro, aucun remboursement.
    const r = computePayout(10000, 320, false, 0);
    expect(r.refundCents).toBe(0);
    expect(r.commissionCents).toBe(500); // 5 % de 100 €
    expect(r.stripeFeeCents).toBe(320);
    expect(r.payoutCents).toBe(10000 - 500 - 320); // 9180
  });

  it("coach Pro : 0 % de commission", () => {
    const r = computePayout(10000, 320, true, 0);
    expect(r.commissionCents).toBe(0);
    expect(r.payoutCents).toBe(10000 - 320); // 9680
  });

  it("la conservation de l'argent tient : refund + fee + commission + payout = montant + fee", () => {
    // (les frais Stripe sortent de la charge, donc payout = montant - refund - fee - commission)
    const amount = 8750;
    const fee = 289;
    const r = computePayout(amount, fee, false, 0);
    expect(r.refundCents + r.commissionCents + r.payoutCents + r.stripeFeeCents).toBe(
      amount
    );
  });

  it("remboursement partiel : la commission ne porte que sur le montant conservé", () => {
    // 100 € encaissés, 40 € remboursés au client → commission sur 60 €.
    const r = computePayout(10000, 300, false, 4000);
    expect(r.refundCents).toBe(4000);
    expect(r.commissionCents).toBe(300); // 5 % de 60 €
    expect(r.payoutCents).toBe(6000 - 300 - 300); // 5400
  });

  it("remboursement > montant : borné au montant (jamais négatif)", () => {
    const r = computePayout(5000, 200, false, 999999);
    expect(r.refundCents).toBe(5000);
    expect(r.commissionCents).toBe(0);
    expect(r.payoutCents).toBe(0);
  });

  it("frais Stripe supérieurs au montant conservé : versement plancher à 0", () => {
    const r = computePayout(1000, 5000, false, 0);
    expect(r.payoutCents).toBe(0);
  });

  it("refund négatif traité comme 0", () => {
    const r = computePayout(10000, 320, true, -500);
    expect(r.refundCents).toBe(0);
    expect(r.payoutCents).toBe(10000 - 320);
  });
});
