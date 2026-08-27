import { describe, it, expect } from "vitest";
import { isPro, proDaysLeft } from "@/lib/subscription/plan";

describe("isPro", () => {
  it("Pro tant que pro_until est dans le futur", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isPro(future)).toBe(true);
  });
  it("Free si expiré, null ou absent", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(isPro(past)).toBe(false);
    expect(isPro(null)).toBe(false);
    expect(isPro(undefined)).toBe(false);
  });
});

describe("proDaysLeft", () => {
  it("arrondi au jour supérieur, 0 si expiré", () => {
    const inTwoDays = new Date(Date.now() + 2 * 86_400_000 - 1000).toISOString();
    expect(proDaysLeft(inTwoDays)).toBe(2);
    expect(proDaysLeft(new Date(Date.now() - 1000).toISOString())).toBe(0);
    expect(proDaysLeft(null)).toBe(0);
  });
});
