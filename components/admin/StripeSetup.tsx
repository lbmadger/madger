"use client";

import { useState } from "react";

type SetupResult = {
  webhook: {
    status: "created" | "exists";
    url: string;
    secret?: string;
    envSet: boolean;
  };
  portal: { status: "created" | "exists" };
  account: {
    chargesEnabled: boolean;
    transfers: string;
    klarna: string;
    country: string | null;
  };
};

// Bouton « Configurer Stripe » : le serveur (qui a la clé secrète) crée le
// webhook + le portail et remonte l'état du compte. Le secret whsec_ n'est
// affiché qu'une fois : à coller dans Vercel → STRIPE_WEBHOOK_SECRET.
export default function StripeSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stripe-setup", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erreur inconnue");
        if (data.partial) setResult(data.partial as SetupResult);
        return;
      }
      setResult(data as SetupResult);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  const Ok = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => (
    <span className={ok ? "text-accent" : "text-red-400"}>
      {ok ? `✅ ${yes}` : `❌ ${no}`}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Configuration…" : "⚙️ Configurer Stripe automatiquement"}
      </button>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          {/* Webhook */}
          <div className="rounded-2xl border border-border bg-bg-card p-4">
            <p className="text-sm font-semibold text-text-base">
              Webhook abonnement Pro{" "}
              <span className="ml-1 text-xs font-normal text-text-dim">
                {result.webhook.url}
              </span>
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {result.webhook.status === "created"
                ? "✅ Créé chez Stripe."
                : "✅ Déjà en place chez Stripe."}
            </p>
            {result.webhook.secret ? (
              <div className="mt-3 rounded-xl border border-accent/30 bg-accent/[0.06] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  ⚠️ À faire maintenant (affiché une seule fois)
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Copie ce secret dans Vercel → Environment Variables →{" "}
                  <code className="text-text-base">STRIPE_WEBHOOK_SECRET</code>{" "}
                  (Production), puis redéploie.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-2 text-xs text-accent">
                    {result.webhook.secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(result.webhook.secret!);
                      setCopied(true);
                    }}
                    className="shrink-0 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-base hover:border-accent"
                  >
                    {copied ? "Copié ✅" : "Copier"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-text-dim">
                Variable STRIPE_WEBHOOK_SECRET sur le serveur :{" "}
                <Ok
                  ok={result.webhook.envSet}
                  yes="présente"
                  no="absente : si tu as perdu le secret, supprime le webhook dans Stripe et relance ce bouton"
                />
              </p>
            )}
          </div>

          {/* Portail */}
          <div className="rounded-2xl border border-border bg-bg-card p-4">
            <p className="text-sm font-semibold text-text-base">
              Portail de facturation (gérer/annuler l'abonnement)
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {result.portal.status === "created"
                ? "✅ Configuration créée."
                : "✅ Déjà configuré."}
            </p>
          </div>

          {/* Compte */}
          <div className="rounded-2xl border border-border bg-bg-card p-4">
            <p className="text-sm font-semibold text-text-base">
              Compte plateforme {result.account.country ? `(${result.account.country})` : ""}
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              <li>
                Encaissement :{" "}
                <Ok ok={result.account.chargesEnabled} yes="actif" no="inactif" />
              </li>
              <li>
                Transferts vers les coachs :{" "}
                <Ok
                  ok={result.account.transfers === "active"}
                  yes="actifs"
                  no={result.account.transfers}
                />
              </li>
              <li>
                Klarna (paiement en 3×) :{" "}
                <Ok
                  ok={result.account.klarna === "active"}
                  yes="actif"
                  no={result.account.klarna === "none" ? "non activé" : result.account.klarna}
                />
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
