// Paiement en 3 fois (Klarna) : uniquement sur les PACKS, à partir de 120 €,
// et seulement si le coach l'a activé dans ses réglages (les frais Klarna,
// plus élevés que la carte, sont déduits de son versement). Le parcours
// unitaire reste carte, Apple Pay et Google Pay, sans changement.
export const INSTALLMENTS_MIN_CENTS = 12000;

export function installmentsEligible(p: {
  serviceType: string | null | undefined;
  priceCents: number | null | undefined;
  coachEnabled: boolean | null | undefined;
}): boolean {
  return (
    p.serviceType === "pack" &&
    (p.priceCents ?? 0) >= INSTALLMENTS_MIN_CENTS &&
    p.coachEnabled === true
  );
}
