import { describe, expect, it } from "vitest";
import { monthlyOffer } from "@/lib/subscription/offer";

describe("monthlyOffer (offre du mois pendant le lancement)", () => {
  it("nomme septembre « Offre de rentrée » et compte jusqu'au 30", () => {
    const o = monthlyOffer("fr", new Date(2026, 8, 9, 12, 0, 0));
    expect(o?.name).toBe("Offre de rentrée");
    expect(o?.daysLeft).toBe(22);
    expect(o?.endsLabel).toBe("30 septembre");
  });
  it("nomme novembre « Black Friday » et décembre « Offre de Noël »", () => {
    expect(monthlyOffer("fr", new Date(2026, 10, 5))?.name).toBe("Black Friday");
    expect(monthlyOffer("en", new Date(2026, 11, 5))?.name).toBe("Christmas offer");
  });
  it("le dernier jour du mois vaut 1", () => {
    expect(monthlyOffer("fr", new Date(2026, 9, 31, 9, 0, 0))?.daysLeft).toBe(1);
  });
  it("disparaît avec la fin de l'offre de lancement", () => {
    expect(monthlyOffer("fr", new Date(2027, 0, 2))).toBeNull();
  });
});
