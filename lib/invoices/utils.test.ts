import { describe, expect, it } from "vitest";
import {
  commissionPeriod,
  creditNotesOf,
  displayInvoiceNumber,
  invoiceNumber,
  madgerInvoiceNumber,
} from "./utils";

const paymentId = "3f9a2b1c-0000-4000-8000-000000000000";

describe("numérotation des factures", () => {
  it("dérive un numéro historique stable du paiement", () => {
    expect(invoiceNumber(paymentId, "2026-03-15T10:00:00Z")).toBe("F-2026-3F9A2B");
    expect(invoiceNumber(paymentId, "2026-03-15T10:00:00Z")).toBe(invoiceNumber(paymentId, "2026-03-15T10:00:00Z"));
  });

  it("préfère le numéro séquentiel stocké, sans jamais renuméroter l'ancien", () => {
    expect(displayInvoiceNumber({ number: "F-2026-0042" }, paymentId, "2026-03-15T10:00:00Z")).toBe("F-2026-0042");
    expect(displayInvoiceNumber([{ number: "AV-2026-0003", kind: "credit_note" }, { number: "F-2026-0042", kind: "invoice" }], paymentId, "2026-03-15T10:00:00Z")).toBe("F-2026-0042");
    expect(displayInvoiceNumber(null, paymentId, "2026-03-15T10:00:00Z")).toBe("F-2026-3F9A2B");
    expect(displayInvoiceNumber({ number: null }, paymentId, "2026-03-15T10:00:00Z")).toBe("F-2026-3F9A2B");
  });

  it("ne confond jamais un avoir avec une facture", () => {
    expect(displayInvoiceNumber([{ number: "AV-2026-0003", kind: "credit_note" }], paymentId, "2026-03-15T10:00:00Z")).toBe("F-2026-3F9A2B");
  });

  it("liste les avoirs, les plus récents d'abord", () => {
    const rows = [
      { number: "AV-2026-0001", kind: "credit_note", issued_at: "2026-02-01" },
      { number: "F-2026-0007", kind: "invoice", issued_at: "2026-01-01" },
      { number: "AV-2026-0002", kind: "credit_note", issued_at: "2026-03-01" },
    ];
    expect(creditNotesOf(rows).map((r) => r.number)).toEqual(["AV-2026-0002", "AV-2026-0001"]);
    expect(creditNotesOf(undefined)).toEqual([]);
  });

  it("numérote la facture de commission Madger de façon déterministe", () => {
    expect(madgerInvoiceNumber("ab12cd34-0000-4000-8000-000000000000", "2026-09")).toBe("MC-2026-09-AB12CD");
  });
});

describe("commissionPeriod", () => {
  it("rattache la commission au mois du versement, sinon de la résolution, sinon de l'encaissement", () => {
    expect(commissionPeriod({ released_at: "2026-09-02T00:30:00Z", resolved_at: null, paid_at: "2026-08-30T10:00:00Z" })).toBe("2026-09");
    expect(commissionPeriod({ released_at: null, resolved_at: "2026-07-31T23:59:00Z", paid_at: "2026-07-01T10:00:00Z" })).toBe("2026-07");
    expect(commissionPeriod({ released_at: null, resolved_at: null, paid_at: "2026-01-05T10:00:00Z" })).toBe("2026-01");
    expect(commissionPeriod({ released_at: null, resolved_at: null, paid_at: null })).toBeNull();
  });
});
