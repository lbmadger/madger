import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import MiniBars, { type BarDatum } from "@/components/dashboard/charts/MiniBars";
import InfoTip from "@/components/ui/InfoTip";

export const dynamic = "force-dynamic";

// Analytics admin : l'entonnoir coach (où les gens décrochent), la croissance
// hebdomadaire, la répartition des abonnements et la durée de rétention des
// abonnés. Le comportement DANS les pages (temps passé, clics, abandons champ
// par champ) vit dans PostHog, lié en bas de page.

type Stage = { label: string; count: number; hint?: string };

function FunnelRow({
  stage,
  prev,
  max,
}: {
  stage: Stage;
  prev: number | null;
  max: number;
}) {
  const widthPct = max > 0 ? Math.max(2, (stage.count / max) * 100) : 2;
  const conv =
    prev != null && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
  const lost = prev != null ? prev - stage.count : 0;
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-text-base">{stage.label}</p>
        <p className="text-xl font-extrabold tabular-nums text-text-base">
          {stage.count}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#9DCC00] to-accent"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="text-text-dim">{stage.hint ?? ""}</span>
        {conv != null && (
          <span className={conv >= 50 ? "text-accent" : "text-warning"}>
            {conv}% de l'étape précédente
            {lost > 0 ? ` · ${lost} perdu${lost > 1 ? "s" : ""}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// Regroupe des dates par semaine (lundi) sur les N dernières semaines.
function weeklyBuckets(dates: string[], weeks: number): BarDatum[] {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // lundi courant
  const buckets: BarDatum[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i * 7);
    buckets.push({
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      value: 0,
    });
  }
  const firstTs = new Date(start).getTime() - (weeks - 1) * 7 * 86400000;
  for (const iso of dates) {
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts) || ts < firstTs) continue;
    const idx = Math.min(
      buckets.length - 1,
      Math.floor((ts - firstTs) / (7 * 86400000))
    );
    buckets[idx].value++;
  }
  return buckets;
}

export default async function AdminAnalytics() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  let early = 0;
  let accounts = 0;
  let onboarded = 0;
  let stripeOn = 0;
  let published = 0;
  let pro = 0;
  let subsMonthly = 0;
  let subsAnnual = 0;
  let coachWeeks: BarDatum[] = [];
  let earlyWeeks: BarDatum[] = [];

  if (admin) {
    const head = { count: "exact" as const, head: true };
    const since = new Date(Date.now() - 13 * 7 * 86400000).toISOString();
    const [a, b, c, d, e, f, subs, coachDates, earlyDates] = await Promise.all([
      admin.from("early_access").select("id", head),
      admin.from("coaches").select("id", head),
      admin.from("coaches").select("id", head).eq("onboarding_completed", true),
      admin.from("coaches").select("id", head).eq("stripe_charges_enabled", true),
      // Critères réels de publication (photo, slug, Stripe, prestation, dispos).
      admin.from("public_coaches").select("id", head),
      admin.from("coaches").select("id", head).gt("pro_until", nowIso),
      admin
        .from("coaches")
        .select("subscription_plan")
        .in("subscription_status", ["active", "trialing"])
        .limit(2000),
      admin.from("coaches").select("created_at").gte("created_at", since).limit(2000),
      admin.from("early_access").select("created_at").gte("created_at", since).limit(2000),
    ]);
    early = a.count ?? 0;
    accounts = b.count ?? 0;
    onboarded = c.count ?? 0;
    stripeOn = d.count ?? 0;
    published = e.count ?? 0;
    pro = f.count ?? 0;
    for (const s of subs.data ?? []) {
      if (s.subscription_plan === "annual") subsAnnual++;
      else subsMonthly++;
    }
    coachWeeks = weeklyBuckets(
      (coachDates.data ?? []).map((r) => r.created_at as string),
      12
    );
    earlyWeeks = weeklyBuckets(
      (earlyDates.data ?? []).map((r) => r.created_at as string),
      12
    );
  }

  // ── Rétention des abonnés (Stripe) : depuis combien de temps les actifs
  // sont abonnés, et combien de temps ont tenu ceux qui ont résilié. ────────
  let activeTenureMonths: number | null = null;
  let churnedLifetimeMonths: number | null = null;
  let churnedCount = 0;
  const stripe = getStripe();
  if (stripe) {
    try {
      const isCoachSub = (sub: { metadata?: Record<string, string> | null }) =>
        sub.metadata?.coach_id && sub.metadata?.kind !== "client_sub";
      const MONTH_S = 30.44 * 86400;
      const nowS = Math.floor(Date.now() / 1000);

      const actives = await stripe.subscriptions.list({ status: "active", limit: 100 });
      const activeSubs = actives.data.filter(isCoachSub);
      if (activeSubs.length > 0) {
        activeTenureMonths =
          activeSubs.reduce((s, x) => s + (nowS - x.created) / MONTH_S, 0) /
          activeSubs.length;
      }

      const canceled = await stripe.subscriptions.list({ status: "canceled", limit: 100 });
      const churned = canceled.data.filter(isCoachSub);
      churnedCount = churned.length;
      if (churned.length > 0) {
        churnedLifetimeMonths =
          churned.reduce(
            (s, x) => s + ((x.ended_at ?? x.canceled_at ?? nowS) - x.created) / MONTH_S,
            0
          ) / churned.length;
      }
    } catch {
      /* Stripe indisponible : les tuiles affichent un tiret. */
    }
  }

  const stages: Stage[] = [
    { label: "Inscrits accès anticipé", count: early, hint: "Formulaire de la landing" },
    { label: "Comptes coach créés", count: accounts, hint: "Y compris onboardings abandonnés" },
    { label: "Onboarding terminé", count: onboarded, hint: "Les 5 étapes finies" },
    { label: "Paiements Stripe activés", count: stripeOn, hint: "Peuvent encaisser" },
    { label: "Publiés sur la marketplace", count: published, hint: "Photo + prestation + dispos + Stripe" },
    { label: "Madger Pro actifs", count: pro, hint: "Abonnés payants ou offerts" },
  ];
  const max = Math.max(...stages.map((s) => s.count), 1);
  const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  const totalSubs = subsMonthly + subsAnnual;
  const monthlyPct = totalSubs > 0 ? Math.round((subsMonthly / totalSubs) * 100) : 0;
  // Donut : circonférence pour r=34.
  const C = 2 * Math.PI * 34;
  const months = (v: number | null) =>
    v == null
      ? "-"
      : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} mois`;

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
      <p className="mt-1 text-sm text-text-muted">
        L'entonnoir coach, la croissance et la rétention : chaque marche perdue
        est un endroit à améliorer.
      </p>

      {/* ── Entonnoir ── */}
      <div className="mt-6 flex flex-col gap-2.5">
        {stages.map((s, i) => (
          <FunnelRow
            key={s.label}
            stage={s}
            prev={i === 0 ? null : stages[i - 1].count}
            max={max}
          />
        ))}
      </div>

      {/* ── Croissance hebdomadaire ── */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-dim">
            Inscrits accès anticipé / semaine
            <InfoTip text="Nouveaux emails laissés sur la landing, par semaine (12 dernières). C'est ton indicateur d'acquisition avant lancement : chaque action marketing (DMs, stories) doit se voir ici." />
          </h3>
          <div className="mt-4">
            <MiniBars data={earlyWeeks} locale="fr-FR" />
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-dim">
            Nouveaux comptes coach / semaine
            <InfoTip text="Comptes coach créés par semaine (12 dernières), onboardings abandonnés compris. À comparer à la courbe d'inscrits : l'écart entre les deux, c'est ta conversion landing → compte." />
          </h3>
          <div className="mt-4">
            <MiniBars data={coachWeeks} locale="fr-FR" />
          </div>
        </section>
      </div>

      {/* ── Abonnements : répartition + rétention ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-dim">
            Répartition des abonnements
            <InfoTip text="Parts des abonnés Pro actifs entre la formule mensuelle (49 € HT) et l'annuelle (490 € HT, comptée 40,83 €/mois de MRR). L'annuel rapporte moins par mois mais fidélise mieux." />
          </h3>
          {totalSubs === 0 ? (
            <p className="mt-6 text-center text-sm text-text-dim">
              Aucun abonné Pro actif pour l'instant.
            </p>
          ) : (
            <div className="mt-4 flex items-center gap-5">
              <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label={`${monthlyPct}% mensuel`}>
                <circle cx="46" cy="46" r="34" fill="none" stroke="rgba(203,255,3,0.22)" strokeWidth="10" />
                <circle
                  cx="46"
                  cy="46"
                  r="34"
                  fill="none"
                  stroke="#CBFF03"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(monthlyPct / 100) * C} ${C}`}
                  transform="rotate(-90 46 46)"
                />
                <text x="46" y="50" textAnchor="middle" fill="#F2F2F0" fontSize="16" fontWeight="800">
                  {totalSubs}
                </text>
              </svg>
              <div className="flex flex-col gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  <span className="text-text-base">
                    Mensuel : <b>{subsMonthly}</b>{" "}
                    <span className="text-text-dim">({monthlyPct}%)</span>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent/25" />
                  <span className="text-text-base">
                    Annuel : <b>{subsAnnual}</b>{" "}
                    <span className="text-text-dim">({100 - monthlyPct}%)</span>
                  </span>
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-dim">
            Rétention des abonnés
            <InfoTip text="Ancienneté = depuis combien de temps les abonnés actifs paient, en moyenne (données Stripe en direct). Durée de vie des résiliés = combien de temps ont tenu ceux qui sont partis : c'est LA mesure du churn, elle devient parlante après quelques mois d'historique." />
          </h3>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-text-muted">
                Ancienneté moyenne (actifs)
              </span>
              <span className="text-xl font-extrabold tabular-nums text-text-base">
                {months(activeTenureMonths)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-text-muted">
                Durée de vie moyenne (résiliés)
              </span>
              <span className="text-xl font-extrabold tabular-nums text-text-base">
                {churnedCount > 0 ? months(churnedLifetimeMonths) : "aucun résilié 🎉"}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-text-dim">
              Source : Stripe en direct. « Combien de temps les gens restent
              abonnés » = la deuxième ligne, dès qu'il y aura des résiliations.
            </p>
          </div>
        </section>
      </div>

      {/* ── Comportement dans les pages : PostHog ── */}
      <section className="mt-8 rounded-2xl border border-border bg-bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-base">
              <span
                className={`h-2 w-2 rounded-full ${posthogConfigured ? "glow-dot bg-accent" : "bg-danger"}`}
              />
              Comportement sur les pages (PostHog)
            </h2>
            <p className="mt-0.5 max-w-lg text-xs text-text-muted">
              Temps passé par page, parcours de visite, clics et abandons
              étape par étape dans les formulaires. Événements suivis : pages
              vues, early_access_step2, early_access_submitted,
              onboarding_step_done (1 à 5), onboarding_completed,
              client_onboarding_*.
            </p>
          </div>
          <a
            href="https://eu.posthog.com"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
          >
            Ouvrir PostHog →
          </a>
        </div>
        {!posthogConfigured && (
          <p className="mt-3 rounded-xl border border-danger/25 bg-danger/[0.06] px-3 py-2 text-xs text-danger">
            Tracking inactif : crée un projet sur eu.posthog.com (gratuit) et
            ajoute NEXT_PUBLIC_POSTHOG_KEY dans Vercel, puis redéploie.
          </p>
        )}
      </section>
    </>
  );
}
