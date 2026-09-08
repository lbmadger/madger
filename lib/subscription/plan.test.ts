import { describe, expect, it } from "vitest";
import {
  FEE_RATE_BPS,
  effectiveProUntil,
  feeRateBps,
  feeRatePercent,
  isPro,
  isProRow,
  planForRateBps,
  planOf,
} from "./plan";
import {
  LAUNCH_OFFER,
  currentAnnualCents,
  currentMonthlyCents,
  euros,
  launchOfferActive,
  launchOfferDaysLeft,
} from "./offer";

const future = new Date(Date.now() + 7 * 86400000).toISOString();
const past = new Date(Date.now() - 7 * 86400000).toISOString();

describe("plans et taux", () => {
  it("fixe les taux : Essentiel 5 %, Pro 3 %, Studio 0 %", () => {
    expect(FEE_RATE_BPS).toEqual({ essential: 500, pro: 300, studio: 0 });
    expect(feeRatePercent("essential")).toBe(5);
    expect(feeRatePercent("pro")).toBe(3);
    expect(feeRatePercent("studio")).toBe(0);
  });

  it("retrouve le plan depuis un taux réellement prélevé, null pour un taux manuel", () => {
    expect(planForRateBps(500)).toBe("essential");
    expect(planForRateBps(300)).toBe("pro");
    expect(planForRateBps(0)).toBe("studio");
    expect(planForRateBps(250)).toBeNull();
  });

  it("Pro effectif = max(pro_until, pro_bonus_until)", () => {
    expect(isPro(future)).toBe(true);
    expect(isPro(past)).toBe(false);
    expect(isPro(null)).toBe(false);
    expect(effectiveProUntil({ pro_until: past, pro_bonus_until: future })).toBe(future);
    expect(effectiveProUntil({ pro_until: future, pro_bonus_until: past })).toBe(future);
    expect(effectiveProUntil({})).toBeNull();
    expect(isProRow({ pro_until: null, pro_bonus_until: future })).toBe(true);
    expect(isProRow({ pro_until: past, pro_bonus_until: null })).toBe(false);
  });

  it("planOf ne renvoie jamais studio tant qu'aucune colonne ne l'active", () => {
    expect(planOf({ pro_until: future })).toBe("pro");
    expect(planOf({ pro_until: past })).toBe("essential");
    expect(planOf(null)).toBe("essential");
    expect(feeRateBps(planOf(null))).toBe(500);
  });
});

describe("offre de lancement", () => {
  const during = new Date(`${LAUNCH_OFFER.until}T12:00:00+01:00`);
  const after = new Date(`${LAUNCH_OFFER.until}T23:59:59+01:00`);
  const afterEnd = new Date(after.getTime() + 1000);

  it("facture le tarif de lancement jusqu'au dernier instant de l'offre, heure de Paris", () => {
    expect(launchOfferActive(during)).toBe(true);
    expect(launchOfferActive(after)).toBe(true);
    expect(launchOfferActive(afterEnd)).toBe(false);
    expect(currentMonthlyCents(during)).toBe(LAUNCH_OFFER.launchMonthlyCents);
    expect(currentAnnualCents(during)).toBe(LAUNCH_OFFER.launchAnnualCents);
    expect(currentMonthlyCents(afterEnd)).toBe(LAUNCH_OFFER.regularMonthlyCents);
    expect(currentAnnualCents(afterEnd)).toBe(LAUNCH_OFFER.regularAnnualCents);
  });

  it("l'annuel vaut dix mois (deux mois offerts) dans les deux régimes", () => {
    expect(LAUNCH_OFFER.launchAnnualCents).toBe(LAUNCH_OFFER.launchMonthlyCents * 10);
    expect(LAUNCH_OFFER.regularAnnualCents).toBe(LAUNCH_OFFER.regularMonthlyCents * 10);
  });

  it("compte les jours restants sans jamais passer sous zéro", () => {
    expect(launchOfferDaysLeft(afterEnd)).toBe(0);
    expect(launchOfferDaysLeft(new Date(after.getTime() - 36 * 3_600_000))).toBe(2);
  });

  it("formate les euros à la française et à l'anglaise", () => {
    expect(euros(4900, "fr").replace(/ | /g, " ")).toBe("49 €");
    expect(euros(4083, "fr").replace(/ | /g, " ")).toBe("40,83 €");
    expect(euros(4900, "en")).toBe("€49");
  });
});
