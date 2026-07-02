import StripeSetup from "@/components/admin/StripeSetup";

export const dynamic = "force-dynamic";

// Configuration Stripe en un clic : webhook abonnement Pro, portail de
// facturation, état du compte (transfers, Klarna). Gating admin via le layout.
export default function AdminStripePage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Stripe</h1>
      <p className="mt-1 text-sm text-text-muted">
        Configure automatiquement ce qui devait se faire à la main dans le
        dashboard Stripe. Réexécutable sans risque (ne recrée rien d'existant).
      </p>
      <div className="mt-6">
        <StripeSetup />
      </div>
    </>
  );
}
