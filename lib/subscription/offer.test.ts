import { describe, expect, it } from "vitest";
import { launchOfferDaysLeft, monthlyOffer } from "@/lib/subscription/offer";

describe("monthlyOffer (offre du mois pendant le lancement)", () => {
  it("nomme septembre « Offre de rentrée » et compte jusqu'à la fin de l'offre de lancement", () => {
    const at = new Date(2026, 8, 9, 12, 0, 0);
    const o = monthlyOffer("fr", at);
    expect(o?.name).toBe("Offre de rentrée");
    // Jamais la fin du mois (fausse urgence) : la vraie date du changement
    // de prix, le 31 décembre.
    expect(o?.daysLeft).toBe(launchOfferDaysLeft(at));
    expect(o?.daysLeft).toBeGreaterThan(100);
    expect(o?.endsLabel).toBe("31 décembre");
  });
  it("nomme novembre « Black Friday » et décembre « Offre de Noël »", () => {
    expect(monthlyOffer("fr", new Date(2026, 10, 5))?.name).toBe("Black Friday");
    expect(monthlyOffer("en", new Date(2026, 11, 5))?.name).toBe("Christmas offer");
  });
  it("le dernier jour de l'offre vaut 1", () => {
    expect(monthlyOffer("fr", new Date(2026, 11, 31, 9, 0, 0))?.daysLeft).toBe(1);
  });
  it("disparaît avec la fin de l'offre de lancement", () => {
    expect(monthlyOffer("fr", new Date(2027, 0, 2))).toBeNull();
  });
});
