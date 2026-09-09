import { describe, expect, it } from "vitest";
import { looksLike } from "@/lib/geo/addresses";

describe("looksLike (filtre des propositions BAN)", () => {
  it("garde une adresse qui reprend numéro et rue tapés", () => {
    expect(looksLike("12 rue des lil", "12 Rue des Lilas 75020 Paris", 0.45)).toBe(true);
  });
  it("écarte une adresse sans rapport avec la saisie", () => {
    expect(looksLike("basic fit dijon", "Rue de la Liberté 21000 Dijon", 0.35)).toBe(false);
    expect(looksLike("tototo", "Rue Toto 75001 Paris", 0.2)).toBe(false);
  });
  it("refuse un numéro de voie différent", () => {
    expect(looksLike("12 rue de la paix", "3 Rue de la Paix 75002 Paris", 0.5)).toBe(false);
  });
  it("fait confiance à un score élevé", () => {
    expect(looksLike("paris", "Paris 75000", 0.9)).toBe(true);
  });
});
