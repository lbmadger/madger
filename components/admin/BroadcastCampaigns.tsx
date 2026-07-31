"use client";

import { useState } from "react";

// Pilotage des campagnes liste d'attente depuis /admin/emails : test vers
// soi-même, puis envoi réel (confirmé). L'API est idempotente : le compteur
// « restants » fond à mesure, rejouer n'envoie jamais deux fois.

type Campaign = {
  key: string;
  title: string;
  desc: string;
  remaining: number;
  // Route dédiée (codes promo) ou campagne générique.
  endpoint?: string;
  noTest?: boolean;
};

export default function BroadcastCampaigns({
  campaigns,
}: {
  campaigns: Campaign[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});

  async function run(c: Campaign, test: boolean) {
    if (
      !test &&
      !window.confirm(
        `Envoyer « ${c.title} » aux ${c.remaining} inscrits restants ? Cette action est définitive.`
      )
    )
      return;
    setBusy(c.key + (test ? ":test" : ""));
    setResult((r) => ({ ...r, [c.key]: "" }));
    try {
      const res = await fetch(c.endpoint ?? "/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: c.endpoint ? undefined : JSON.stringify({ campaign: c.key, test }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        sent?: number;
        error?: string;
      };
      setResult((r) => ({
        ...r,
        [c.key]: res.ok
          ? test
            ? "Test envoyé sur ton email ✓"
            : `${json.sent ?? 0} email(s) envoyé(s) ✓`
          : `Erreur : ${json.error ?? res.status}`,
      }));
    } catch {
      setResult((r) => ({ ...r, [c.key]: "Erreur réseau" }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {campaigns.map((c) => (
        <div
          key={c.key}
          className="rounded-2xl border border-border bg-bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-base">{c.title}</p>
              <p className="mt-0.5 text-xs text-text-muted">{c.desc}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                c.remaining > 0
                  ? "bg-accent/10 text-accent"
                  : "border border-border-strong text-text-dim"
              }`}
            >
              {c.remaining > 0 ? `${c.remaining} restants` : "tout envoyé"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!c.noTest && (
              <button
                type="button"
                onClick={() => run(c, true)}
                disabled={busy !== null}
                className="rounded-full border border-border-strong px-3.5 py-1.5 text-xs font-medium text-text-base transition-colors hover:border-accent disabled:opacity-50"
              >
                {busy === `${c.key}:test` ? "Envoi…" : "M'envoyer un test"}
              </button>
            )}
            <button
              type="button"
              onClick={() => run(c, false)}
              disabled={busy !== null || c.remaining === 0}
              className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy === c.key ? "Envoi…" : "Envoyer à la liste"}
            </button>
            {result[c.key] && (
              <span
                className={`text-xs ${result[c.key].startsWith("Erreur") ? "text-danger" : "text-accent"}`}
              >
                {result[c.key]}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
