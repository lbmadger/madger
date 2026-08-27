import { describe, it, expect } from "vitest";
import {
  invoiceNumber,
  madgerInvoiceNumber,
  commissionPeriod,
} from "@/lib/invoices/utils";

describe("invoiceNumber", () => {
  it("dérive un numéro déterministe du paiement", () => {
    const n = invoiceNumber("ab12cd34-0000-0000-0000-000000000000", "2026-03-15T10:00:00Z");
    expect(n).toBe("F-2026-AB12CD");
  });
  it("stable : deux appels donnent le même numéro", () => {
    const a = invoiceNumber("deadbeef-1111", "2025-01-01T00:00:00Z");
    const b = invoiceNumber("deadbeef-1111", "2025-01-01T00:00:00Z");
    expect(a).toBe(b);
  });
});

describe("madgerInvoiceNumber", () => {
  it("un coach + un mois = un numéro", () => {
    expect(madgerInvoiceNumber("ff00 aa11".replace(" ", ""), "2026-02")).toMatch(
      /^MC-2026-02-/
    );
  });
});

describe("commissionPeriod", () => {
  it("priorité à la date de versement", () => {
    expect(
      commissionPeriod({
        released_at: "2026-05-20T12:00:00Z",
        resolved_at: "2026-06-01T12:00:00Z",
        paid_at: "2026-04-01T12:00:00Z",
      })
    ).toBe("2026-05");
  });
  it("repli sur la résolution puis l'encaissement", () => {
    expect(
      commissionPeriod({ released_at: null, resolved_at: "2026-07-09T00:00:00Z", paid_at: null })
    ).toBe("2026-07");
    expect(
      commissionPeriod({ released_at: null, resolved_at: null, paid_at: "2026-12-31T23:00:00Z" })
    ).toBe("2026-12");
  });
  it("null si aucune date", () => {
    expect(
      commissionPeriod({ released_at: null, resolved_at: null, paid_at: null })
    ).toBeNull();
  });
});
