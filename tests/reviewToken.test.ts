import { describe, it, expect, beforeAll } from "vitest";

// Secret fixe pour des jetons déterministes pendant le test (posé avant import).
beforeAll(() => {
  process.env.REVIEW_TOKEN_SECRET = "test-secret-please-change";
});

describe("reviewToken / verifyReviewToken", () => {
  it("un jeton valide est accepté pour SA réservation", async () => {
    const { reviewToken, verifyReviewToken } = await import("@/lib/reviews/token");
    const id = "booking-123";
    const token = reviewToken(id);
    expect(token.length).toBeGreaterThan(0);
    expect(verifyReviewToken(id, token)).toBe(true);
  });

  it("le jeton d'une AUTRE réservation est rejeté (pas de réutilisation)", async () => {
    const { reviewToken, verifyReviewToken } = await import("@/lib/reviews/token");
    const token = reviewToken("booking-A");
    expect(verifyReviewToken("booking-B", token)).toBe(false);
  });

  it("jeton absent, vide ou falsifié → rejeté", async () => {
    const { verifyReviewToken } = await import("@/lib/reviews/token");
    expect(verifyReviewToken("booking-123", null)).toBe(false);
    expect(verifyReviewToken("booking-123", "")).toBe(false);
    expect(verifyReviewToken("booking-123", "not-a-real-token")).toBe(false);
  });

  it("reviewLink insère le jeton en query", async () => {
    const { reviewLink, reviewToken } = await import("@/lib/reviews/token");
    const link = reviewLink("https://madger.app", "bk-9");
    expect(link).toBe(`https://madger.app/reservation/bk-9?r=${reviewToken("bk-9")}`);
  });
});
