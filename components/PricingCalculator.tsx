"use client";

import { useState } from "react";
import { FEE_RATE_BPS } from "@/lib/subscription/plan";
import { currentMonthlyCents } from "@/lib/subscription/offer";

// Calculateur de coût sous les cartes de tarifs : deux curseurs (séances par
// mois, prix moyen), résultat en direct pour Essentiel et Pro, plus deux
// repères externes posés comme HYPOTHÈSES écrites en clair. Client-side pur,
// aucune requête. Les taux et le prix Pro viennent des sources de vérité
// (lib/subscription), jamais d'un montant en dur.

// Repères externes (hypothèses affichées sous le calculateur).
const OTHER_TOOL_MONTHLY = 15; // outil à abonnement affiché sans frais de plateforme
const CALENDLY_MONTHLY = 12;
const STRIPE_PCT = 1.5; // frais Stripe standard, cartes européennes
const STRIPE_FIXED = 0.25; // par paiement

const eur = (n: number) =>
  n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

export default function PricingCalculator() {
  const [sessions, setSessions] = useState(20);
  const [price, setPrice] = useState(50);

  const revenue = sessions * price;
  const essentialRate = FEE_RATE_BPS.essential / 10000;
  const proRate = FEE_RATE_BPS.pro / 10000;
  const proMonthly = currentMonthlyCents() / 100;
  const essential = revenue * essentialRate;
  const pro = proMonthly + revenue * proRate;
  const stripeFees = revenue * (STRIPE_PCT / 100) + sessions * STRIPE_FIXED;
  const otherTool = OTHER_TOOL_MONTHLY + stripeFees;
  const calendly = CALENDLY_MONTHLY + stripeFees;
  // Point de bascule : Pro devient moins cher qu'Essentiel au-delà de ce
  // chiffre d'affaires mensuel (abonnement / écart de taux).
  const breakeven = proMonthly / (essentialRate - proRate);
  const proCheaper = pro < essential;

  return (
    <div
      className="max-w-3xl mx-auto mt-8 rounded-2xl sm:rounded-3xl p-5 sm:p-8"
      style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <p className="text-white font-extrabold" style={{ fontSize: 18, letterSpacing: "-0.02em" }}>
        Combien ça te coûte, chez toi ?
      </p>
      <p className="mt-1 text-xs" style={{ color: "#8C8C8C" }}>
        Bouge les curseurs : le calcul se fait en direct, rien n&apos;est envoyé.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between text-xs" style={{ color: "#C9C9C4" }}>
            Séances encaissées par mois
            <span className="text-white font-bold tabular-nums text-sm">{sessions}</span>
          </span>
          <input
            type="range"
            min={1}
            max={120}
            step={1}
            value={sessions}
            onChange={(e) => setSessions(Number(e.target.value))}
            className="w-full accent-[#CBFF03]"
            aria-label="Séances encaissées par mois"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between text-xs" style={{ color: "#C9C9C4" }}>
            Prix moyen d&apos;une séance
            <span className="text-white font-bold tabular-nums text-sm">{eur(price)}</span>
          </span>
          <input
            type="range"
            min={15}
            max={150}
            step={5}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full accent-[#CBFF03]"
            aria-label="Prix moyen d'une séance"
          />
        </label>
      </div>

      <p className="mt-4 text-xs" style={{ color: "#8C8C8C" }}>
        Soit <span className="text-white font-semibold tabular-nums">{eur(revenue)}</span> encaissés par mois.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-4"
          style={{
            border: `1px solid ${proCheaper ? "rgba(255,255,255,0.07)" : "rgba(203,255,3,0.35)"}`,
            background: proCheaper ? "transparent" : "rgba(203,255,3,0.05)",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8A8A8A" }}>
            Essentiel
          </p>
          <p className="mt-1 text-white font-extrabold tabular-nums" style={{ fontSize: "clamp(20px, 4vw, 28px)", letterSpacing: "-0.03em" }}>
            {eur(essential)}
            <span className="text-xs font-semibold" style={{ color: "#9a9a9a" }}> / mois</span>
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "#8C8C8C" }}>
            {FEE_RATE_BPS.essential / 100} % de {eur(revenue)}, frais de transaction inclus
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            border: `1px solid ${proCheaper ? "rgba(203,255,3,0.35)" : "rgba(255,255,255,0.07)"}`,
            background: proCheaper ? "rgba(203,255,3,0.05)" : "transparent",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#CBFF03" }}>
            Madger Pro
          </p>
          <p className="mt-1 text-white font-extrabold tabular-nums" style={{ fontSize: "clamp(20px, 4vw, 28px)", letterSpacing: "-0.03em" }}>
            {eur(pro)}
            <span className="text-xs font-semibold" style={{ color: "#9a9a9a" }}> / mois</span>
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "#8C8C8C" }}>
            {eur(proMonthly)} + {FEE_RATE_BPS.pro / 100} % de {eur(revenue)}, frais de transaction inclus
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold" style={{ color: "#CBFF03" }}>
        {proCheaper
          ? `À ce volume, Pro te revient ${eur(essential - pro)} de moins qu'Essentiel chaque mois.`
          : `Au-delà de ${eur(breakeven)} encaissés par mois, Pro te coûte moins cher qu'Essentiel.`}
      </p>

      <div className="mt-4 flex flex-col gap-1.5 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#8A8A8A" }}>
          Pour comparer, avec les mêmes chiffres
        </p>
        <p className="flex items-baseline justify-between gap-3 text-xs" style={{ color: "#C9C9C4" }}>
          <span>Outil à {eur(OTHER_TOOL_MONTHLY)}/mois affiché « sans frais de plateforme », plus les frais Stripe standard</span>
          <span className="text-white font-semibold tabular-nums shrink-0">{eur(otherTool)}</span>
        </p>
        <p className="flex items-baseline justify-between gap-3 text-xs" style={{ color: "#C9C9C4" }}>
          <span>Calendly à {eur(CALENDLY_MONTHLY)}/mois, plus les frais Stripe standard</span>
          <span className="text-white font-semibold tabular-nums shrink-0">{eur(calendly)}</span>
        </p>
        <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#6F6F6F" }}>
          Hypothèses : prix TTC, un paiement par carte par séance, frais Stripe standard en France de {STRIPE_PCT.toLocaleString("fr-FR")} % + {STRIPE_FIXED.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} par paiement (cartes européennes), abonnements des autres outils à leur tarif public indicatif, hors remboursements et litiges. Chez Madger, les frais de carte, les remboursements et les litiges sont compris dans le pourcentage.
        </p>
      </div>
    </div>
  );
}
