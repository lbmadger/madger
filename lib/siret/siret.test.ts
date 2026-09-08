import { describe, expect, it } from "vitest";
import { cleanSiret, isValidSiret, lookupSiret } from "./siret";

describe("isValidSiret", () => {
  it("accepte un SIRET à clé de Luhn valide, avec ou sans espaces", () => {
    expect(isValidSiret("933 449 365 00016")).toBe(true); // SIRET Madger (lib/invoices/madger.ts)
    expect(isValidSiret("73282932000074")).toBe(true); // exemple INSEE
    expect(cleanSiret(" 732 829 320 00074 ")).toBe("73282932000074");
  });

  it("refuse une longueur ou une clé fausse", () => {
    expect(isValidSiret("73282932000075")).toBe(false);
    expect(isValidSiret("1234567890123")).toBe(false);
    expect(isValidSiret("")).toBe(false);
    expect(isValidSiret("abcdefghijklmn")).toBe(false);
  });

  it("accepte l'exception La Poste (somme des chiffres multiple de 5)", () => {
    expect(isValidSiret("35600000000048")).toBe(true);
  });
});

describe("lookupSiret", () => {
  const ok = (body: unknown, status = 200) =>
    (async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;

  it("trouve l'établissement correspondant et remet le nom en forme", async () => {
    const r = await lookupSiret(
      "73282932000074",
      ok({
        results: [
          {
            nom_complet: "COACHING DUPONT SAS",
            siege: { siret: "73282932000074", etat_administratif: "A", libelle_commune: "LYON 7EME" },
            matching_etablissements: [{ siret: "73282932000074", etat_administratif: "A", libelle_commune: "LYON 7EME" }],
          },
        ],
      })
    );
    expect(r).toEqual({ status: "found", legalName: "Coaching Dupont SAS", active: true, city: "Lyon 7eme" });
  });

  it("signale un établissement fermé", async () => {
    const r = await lookupSiret(
      "73282932000074",
      ok({ results: [{ nom_complet: "X", matching_etablissements: [{ siret: "73282932000074", etat_administratif: "F" }] }] })
    );
    expect(r).toMatchObject({ status: "found", active: false });
  });

  it("not_found si aucun résultat, si le SIRET ne correspond à aucun établissement, ou si la clé est fausse", async () => {
    expect(await lookupSiret("73282932000074", ok({ results: [] }))).toEqual({ status: "not_found" });
    expect(await lookupSiret("73282932000074", ok({ results: [{ nom_complet: "X", siege: { siret: "00000000000000" } }] }))).toEqual({ status: "not_found" });
    expect(await lookupSiret("73282932000075", ok({ results: [] }))).toEqual({ status: "not_found" });
  });

  it("unavailable si l'API tombe ou répond en erreur : on n'accuse jamais le coach", async () => {
    expect(await lookupSiret("73282932000074", ok({}, 503))).toEqual({ status: "unavailable" });
    const boom = (async () => { throw new Error("network"); }) as unknown as typeof fetch;
    expect(await lookupSiret("73282932000074", boom)).toEqual({ status: "unavailable" });
  });
});
