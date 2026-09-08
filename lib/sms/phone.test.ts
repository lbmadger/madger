import { describe, expect, it } from "vitest";
import { isFrenchMobile, toE164 } from "./phone";

describe("toE164", () => {
  it("normalise les écritures françaises courantes", () => {
    expect(toE164("06 12 34 56 78")).toBe("+33612345678");
    expect(toE164("06.12.34.56.78")).toBe("+33612345678");
    expect(toE164("07-12-34-56-78")).toBe("+33712345678");
    expect(toE164("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(toE164("0033612345678")).toBe("+33612345678");
    expect(toE164("+33 (0)6 12 34 56 78")).toBe("+33612345678"); // (0) = indicatif national
  });

  it("conserve un numéro international valide, rejette le reste", () => {
    expect(toE164("+41791234567")).toBe("+41791234567");
    expect(toE164("+1 (415) 555-2671")).toBe("+14155552671");
    expect(toE164("612345678")).toBeNull();
    expect(toE164("06 12 34")).toBeNull();
    expect(toE164("")).toBeNull();
    expect(toE164(null)).toBeNull();
  });
});

describe("isFrenchMobile", () => {
  it("n'accepte que 06 et 07", () => {
    expect(isFrenchMobile("+33612345678")).toBe(true);
    expect(isFrenchMobile("+33712345678")).toBe(true);
    expect(isFrenchMobile("+33112345678")).toBe(false);
    expect(isFrenchMobile("+41791234567")).toBe(false);
    expect(isFrenchMobile(null)).toBe(false);
  });
});
