import { describe, expect, it } from "vitest";
import {
  ESSENTIAL_REFUND_POLICY,
  DEFAULT_REFUND_POLICY,
  clampCancelHours,
  creditRestoredIfCancelled,
  policyTiers,
  refundCents,
  refundFraction,
  resolveRefundPolicy,
} from "./cancellation";

const H = 3_600_000;
const start = new Date("2026-10-01T10:00:00Z");
const at = (hoursBefore: number) => new Date(start.getTime() - hoursBefore * H);

describe("resolveRefundPolicy", () => {
  it("impose la règle fixe 100 / 0 à 24 h à un coach Essentiel", () => {
    const p = resolveRefundPolicy({
      pro: false,
      refund_over_24h_pct: 25,
      refund_under_24h_pct: 25,
      cancel_hours: 48,
    });
    expect(p).toEqual(ESSENTIAL_REFUND_POLICY);
  });

  it("garde la règle fixe pour un pro_until expiré, même avec un bonus expiré", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const p = resolveRefundPolicy({ pro_until: past, pro_bonus_until: past, refund_over_24h_pct: 50, refund_under_24h_pct: 50 });
    expect(p).toEqual(ESSENTIAL_REFUND_POLICY);
  });

  it("respecte les pourcentages explicites d'un coach Pro (bonus parrainage compris)", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const p = resolveRefundPolicy({
      pro_until: null,
      pro_bonus_until: future,
      refund_over_24h_pct: 75,
      refund_under_24h_pct: 25,
      cancel_hours: 48,
    });
    expect(p).toEqual({ overPct: 75, underPct: 25, hours: 48 });
  });

  it("convertit les anciennes formules quand les pourcentages manquent", () => {
    expect(resolveRefundPolicy({ pro: true, cancellation_policy: "flexible" })).toEqual({ overPct: 100, underPct: 50, hours: 24 });
    expect(resolveRefundPolicy({ pro: true, cancellation_policy: "strict", cancel_hours: 12 })).toEqual({ overPct: 50, underPct: 0, hours: 12 });
  });

  it("retombe sur la politique par défaut sans aucune information", () => {
    expect(resolveRefundPolicy(null)).toEqual(DEFAULT_REFUND_POLICY);
    expect(resolveRefundPolicy({ pro: true })).toEqual(DEFAULT_REFUND_POLICY);
  });

  it("borne les pourcentages entre 0 et 100 et ignore les délais exotiques", () => {
    const p = resolveRefundPolicy({ pro: true, refund_over_24h_pct: 250, refund_under_24h_pct: -10, cancel_hours: 36 });
    expect(p).toEqual({ overPct: 100, underPct: 0, hours: 24 });
    expect(clampCancelHours("48")).toBe(48);
    expect(clampCancelHours(undefined)).toBe(24);
  });
});

describe("refundFraction / refundCents", () => {
  const policy = { overPct: 75, underPct: 25, hours: 24 };

  it("rembourse overPct au-delà du délai, underPct en deçà", () => {
    expect(refundFraction(policy, start, at(25))).toBe(0.75);
    expect(refundFraction(policy, start, at(24))).toBe(0.75); // pile sur le seuil : côté client
    expect(refundFraction(policy, start, at(23.99))).toBe(0.25);
    expect(refundFraction(policy, start, at(0.01))).toBe(0.25);
  });

  it("ne rembourse rien après le début de la séance", () => {
    expect(refundFraction(policy, start, at(0))).toBe(0);
    expect(refundFraction(policy, start, at(-2))).toBe(0);
  });

  it("arrondit au centime", () => {
    expect(refundCents(policy, start, 5_000, at(48))).toBe(3_750);
    expect(refundCents(policy, start, 4_999, at(1))).toBe(1_250); // 1249.75 → 1250
    expect(refundCents(policy, start, 4_999, at(-1))).toBe(0);
  });

  it("applique la règle Essentiel : tout ou rien à 24 h", () => {
    expect(refundCents(ESSENTIAL_REFUND_POLICY, start, 6_000, at(24.5))).toBe(6_000);
    expect(refundCents(ESSENTIAL_REFUND_POLICY, start, 6_000, at(23.5))).toBe(0);
  });
});

describe("creditRestoredIfCancelled", () => {
  it("rend le crédit avant le délai du pack, le perd après", () => {
    expect(creditRestoredIfCancelled(24, start, at(24))).toBe(true);
    expect(creditRestoredIfCancelled(24, start, at(23))).toBe(false);
    expect(creditRestoredIfCancelled(999, start, at(30))).toBe(true); // délai inconnu → 24 h
  });
});

describe("policyTiers", () => {
  it("expose deux paliers, du plus lointain au plus proche", () => {
    expect(policyTiers({ overPct: 100, underPct: 50, hours: 48 })).toEqual([
      { minHoursBefore: 48, refund: 1 },
      { minHoursBefore: 0, refund: 0.5 },
    ]);
  });
});
