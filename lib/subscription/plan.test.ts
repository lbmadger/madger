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
  LAUNCH_LINK,
  PRO_PRICE,
  currentAnnualCents,
  currentMonthlyCents,
  euros,
  launchLinkActive,
  launchLinkEligible,
  launchLinkMonthlyCents,
  launchLinkDeadlineLabel,
  launchLinkUntilLabel,
} from "./offer";

const future = new Date(Date.now() + 7 * 86400000).toISOString();
const past = new Date(Date.now() - 7 * 86400000).toISOString();

describe("plans et taux", () => {
  it("fixe les taux : Essentiel 7 %, Pro 3 %, Studio 0 %", () => {
    expect(FEE_RATE_BPS).toEqual({ essential: 700, pro: 300, studio: 0 });
    expect(feeRatePercent("essential")).toBe(7);
    expect(feeRatePercent("pro")).toBe(3);
    expect(feeRatePercent("studio")).toBe(0);
  });

  it("retrouve le plan depuis un taux réellement prélevé, null pour un taux manuel", () => {
    expect(planForRateBps(700)).toBe("essential");
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
    expect(feeRateBps(planOf(null))).toBe(700);
  });
});

describe("prix du Pro et offre de lancement", () => {
  const last = new Date(`${LAUNCH_LINK.claimUntil}T23:59:59+02:00`);
  const afterEnd = new Date(last.getTime() + 1000);

  it("facture 49 € par mois et 490 € par an, sans date de fin", () => {
    expect(currentMonthlyCents()).toBe(PRO_PRICE.monthlyCents);
    expect(currentAnnualCents()).toBe(PRO_PRICE.annualCents);
    expect(PRO_PRICE.annualCents).toBe(PRO_PRICE.monthlyCents * 10);
  });

  it("ouvre l'offre jusqu'au dernier instant du 10 octobre, heure de Paris", () => {
    expect(launchLinkActive(new Date("2026-10-01T10:00:00+02:00"))).toBe(true);
    expect(launchLinkActive(last)).toBe(true);
    expect(launchLinkActive(afterEnd)).toBe(false);
    expect(launchLinkEligible("2026-09-20T08:00:00Z")).toBe(true);
    expect(launchLinkEligible(last.toISOString())).toBe(true);
    expect(launchLinkEligible(afterEnd.toISOString())).toBe(false);
    expect(launchLinkEligible("n'importe quoi")).toBe(false);
  });

  it("remise de 50 % sur le mensuel, libellés de date", () => {
    expect(launchLinkMonthlyCents()).toBe(2450);
    expect(launchLinkUntilLabel("fr")).toBe("10 octobre");
    expect(launchLinkDeadlineLabel("fr")).toBe("11 octobre");
    expect(launchLinkDeadlineLabel("en")).toBe("11 October");
  });

  it("formate les euros à la française et à l'anglaise", () => {
    expect(euros(4900, "fr").replace(/ | /g, " ")).toBe("49 €");
    expect(euros(4083, "fr").replace(/ | /g, " ")).toBe("40,83 €");
    expect(euros(4900, "en")).toBe("€49");
  });
});
