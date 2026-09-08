import { describe, expect, it } from "vitest";
import { packPaidTotal, packProrata, packRefundableUnits } from "./prorata";

describe("packRefundableUnits", () => {
  it("compte les séances payées non consommées", () => {
    // Pack de 10 payées, 3 consommées : 7 remboursables.
    expect(packRefundableUnits(10, 3, 10, false)).toBe(7);
    // La séance en cours d'annulation compte comme non consommée.
    expect(packRefundableUnits(10, 4, 10, true)).toBe(7);
  });

  it("consomme les séances offertes en dernier : elles ne se remboursent jamais", () => {
    // 10 payées + 2 offertes = 12, 3 consommées : 9 restantes, dont 2 offertes.
    expect(packRefundableUnits(12, 3, 10, false)).toBe(7);
    // 11 consommées : 1 restante, offerte → 0 remboursable.
    expect(packRefundableUnits(12, 11, 10, false)).toBe(0);
  });

  it("se replie sur le total quand paid_total est absent (packs antérieurs)", () => {
    expect(packRefundableUnits(10, 2, null, false)).toBe(8);
    expect(packRefundableUnits(10, 2, 0, false)).toBe(8);
  });

  it("ne dépasse jamais le nombre de séances payées ni ne passe sous zéro", () => {
    expect(packRefundableUnits(10, 0, 10, true)).toBe(10); // includeCurrent ne crée pas une 11e
    expect(packRefundableUnits(10, 15, 10, false)).toBe(0); // sur-consommation défensive
  });
});

describe("packPaidTotal", () => {
  it("préfère paid_total, sinon total", () => {
    expect(packPaidTotal(12, 10)).toBe(10);
    expect(packPaidTotal(12, null)).toBe(12);
    expect(packPaidTotal(12, 0)).toBe(12);
  });
});

describe("packProrata", () => {
  it("calcule la part du montant pour n séances payées, arrondie au centime", () => {
    expect(packProrata(50_000, 7, 10)).toBe(35_000);
    expect(packProrata(10_000, 1, 3)).toBe(3_333);
    expect(packProrata(10_000, 2, 3)).toBe(6_667);
  });

  it("plafonne au montant payé et rend 0 sans séance payée", () => {
    expect(packProrata(50_000, 12, 10)).toBe(50_000);
    expect(packProrata(50_000, 3, 0)).toBe(0);
  });

  it("libération progressive + remboursement du reste = montant payé", () => {
    const amount = 45_000;
    const paid = 9;
    const released = packProrata(amount, 4, paid);
    const refunded = packProrata(amount, 5, paid);
    expect(released + refunded).toBe(amount);
  });
});
