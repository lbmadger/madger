import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPro } from "@/lib/subscription/plan";
import AnimatedStat from "@/components/dashboard/AnimatedStat";
import AdminMap, { type AdminMapPoint } from "@/components/admin/AdminMap";

export const dynamic = "force-dynamic";

// Vue d'ensemble admin façon control room : gros compteurs animés (coachs,
// clients, inscrits) + carte de répartition géographique des coachs.
export default async function AdminOverview() {
  const admin = createAdminClient();

  let coaches = 0;
  let clients = 0;
  let early = 0;
  let bookings = 0;
  let disputes = 0;
  let released = 0;
  let commission = 0;
  let proCount = 0;
  let points: AdminMapPoint[] = [];
  // Finances entreprise.
  let mrrCents = 0;
  let subsMonthly = 0;
  let subsAnnual = 0;
  let commissionMonthCents = 0;
  let commissionPrevMonthCents = 0;
  let gmv30Cents = 0;
  let gmvPrev30Cents = 0;
  let coachesThisMonth = 0;
  let coachesPrevMonth = 0;
  let earlyThisMonth = 0;
  let earlyPrevMonth = 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  if (admin) {
    const head = { count: "exact" as const, head: true };
    const [c1, c2, c3, c4, c5, c6, comm, geo, subs, pays, cm, cpm, em, epm] = await Promise.all([
      admin.from("coaches").select("id", head),
      admin.from("clients").select("id", head),
      admin.from("early_access").select("id", head),
      admin.from("bookings").select("id", head),
      admin.from("payments").select("id", head).eq("escrow_status", "disputed"),
      admin.from("payments").select("id", head).eq("escrow_status", "released"),
      // Somme en base (migration 0040) : exacte à tout volume, là où un
      // select de lignes plafonnerait à 1000.
      admin.rpc("admin_total_commission"),
      admin
        .from("coaches")
        .select("first_name, last_name, city, lat, lng, pro_until")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .limit(1000),
      // Abonnements Pro actifs → MRR (mensuel 49 €, annuel 490/12).
      admin
        .from("coaches")
        .select("subscription_status, subscription_plan")
        .in("subscription_status", ["active", "trialing"])
        .limit(2000),
      // Paiements récents : commissions du mois (datées du versement) et
      // volume encaissé 30 jours. Fenêtre large, filtrage précis en JS.
      admin
        .from("payments")
        .select("amount_cents, commission_cents, paid_at, released_at, resolved_at, status")
        .eq("status", "paid")
        .gte("paid_at", new Date(now.getTime() - 210 * 86400000).toISOString())
        .limit(2000),
      admin.from("coaches").select("id", head).gte("created_at", monthStart.toISOString()),
      admin.from("coaches").select("id", head).gte("created_at", prevMonthStart.toISOString()).lt("created_at", monthStart.toISOString()),
      admin.from("early_access").select("id", head).gte("created_at", monthStart.toISOString()),
      admin.from("early_access").select("id", head).gte("created_at", prevMonthStart.toISOString()).lt("created_at", monthStart.toISOString()),
    ]);
    coaches = c1.count ?? 0;
    clients = c2.count ?? 0;
    early = c3.count ?? 0;
    bookings = c4.count ?? 0;
    disputes = c5.count ?? 0;
    released = c6.count ?? 0;
    commission = Number(comm.data ?? 0) || 0;
    coachesThisMonth = cm.count ?? 0;
    coachesPrevMonth = cpm.count ?? 0;
    earlyThisMonth = em.count ?? 0;
    earlyPrevMonth = epm.count ?? 0;

    for (const s of subs.data ?? []) {
      if (s.subscription_plan === "annual") {
        subsAnnual++;
        mrrCents += Math.round(49000 / 12);
      } else {
        subsMonthly++;
        mrrCents += 4900;
      }
    }
    const d30 = now.getTime() - 30 * 86400000;
    const d60 = now.getTime() - 60 * 86400000;
    for (const p of pays.data ?? []) {
      const paidTs = p.paid_at ? new Date(p.paid_at as string).getTime() : 0;
      if (paidTs >= d30) gmv30Cents += (p.amount_cents as number) || 0;
      else if (paidTs >= d60) gmvPrev30Cents += (p.amount_cents as number) || 0;
      // Commission rattachée au mois de son versement au coach (même règle
      // que la page factures) : released_at, sinon résolution, sinon paiement.
      const at =
        (p.released_at as string | null) ??
        (p.resolved_at as string | null) ??
        (p.paid_at as string | null);
      const atTs = at ? new Date(at).getTime() : 0;
      const commCents = (p.commission_cents as number) || 0;
      if (atTs >= monthStart.getTime() && commCents > 0) {
        commissionMonthCents += commCents;
      } else if (atTs >= prevMonthStart.getTime() && atTs < monthStart.getTime() && commCents > 0) {
        commissionPrevMonthCents += commCents;
      }
    }

    points = (geo.data ?? []).map((c) => {
      const pro = isPro(c.pro_until as string | null);
      if (pro) proCount++;
      return {
        lat: c.lat as number,
        lng: c.lng as number,
        label:
          [
            [c.first_name, c.last_name].filter(Boolean).join(" "),
            c.city as string | null,
          ]
            .filter(Boolean)
            .join(" · ") || "Coach",
        pro,
      };
    });
  }

  // Tendance vs période précédente (null si pas de base de comparaison).
  const pctTrend = (cur: number, prev: number, vsLabel: string) =>
    prev > 0
      ? {
          text: `${cur >= prev ? "+" : ""}${Math.round(((cur - prev) / prev) * 100)}% ${vsLabel}`,
          positive: cur >= prev,
        }
      : null;

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Vue d'ensemble</h1>
      <p className="mt-1 text-sm text-text-muted">
        Suivi de l'activité Madger en temps réel.
      </p>

      {/* Litiges : l'alerte AVANT les chiffres, on ne l'enterre pas. */}
      {disputes > 0 && (
        <Link
          href="/admin/litiges"
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/[0.06] px-4 py-3 transition-colors hover:border-danger/50"
        >
          <p className="text-sm font-semibold text-text-base">
            {disputes} litige{disputes > 1 ? "s" : ""} en cours
          </p>
          <span className="shrink-0 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white">
            Traiter
          </span>
        </Link>
      )}

      {/* Compteurs héros : les deux populations, en grand. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Link href="/admin/coachs" className="block transition-transform hover:-translate-y-0.5">
          <AnimatedStat
            label="Coachs"
            value={coaches}
            index={0}
            trend={pctTrend(coachesThisMonth, coachesPrevMonth, "vs mois dernier")}
            hint={`+${coachesThisMonth} ce mois · ${coachesPrevMonth} le mois dernier`}
          />
        </Link>
        <Link href="/admin/clients" className="block transition-transform hover:-translate-y-0.5">
          <AnimatedStat label="Clients" value={clients} index={1} />
        </Link>
      </div>

      {/* Second rang : le reste de l'activité. */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <AnimatedStat
          label="Inscrits accès anticipé"
          value={early}
          index={2}
          trend={pctTrend(earlyThisMonth, earlyPrevMonth, "vs mois dernier")}
          hint={`+${earlyThisMonth} ce mois · ${earlyPrevMonth} le mois dernier`}
        />
        <AnimatedStat label="Séances" value={bookings} index={3} />
        <AnimatedStat label="Séances réglées" value={released} index={4} />
        <AnimatedStat
          label="Abonnés Pro actifs"
          value={subsMonthly + subsAnnual}
          index={5}
          hint={
            subsMonthly + subsAnnual > 0
              ? `${subsMonthly} mensuel${subsMonthly > 1 ? "s" : ""} · ${subsAnnual} annuel${subsAnnual > 1 ? "s" : ""}`
              : undefined
          }
        />
      </div>

      {/* Finances de l'entreprise : ce que Madger gagne, pas ce qui transite. */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-base">
          <span className="glow-dot h-2 w-2 rounded-full bg-accent" />
          Finances
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Revenus Madger (HT) : abonnements + commissions. Le volume traité
          transite par les coachs, seule la commission est à toi.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <AnimatedStat
            label="MRR abonnements"
            value={mrrCents}
            kind="currency"
            index={0}
            info="Revenu mensuel récurrent : la somme des abonnements Pro actifs ramenés au mois. Un mensuel compte 49 €, un annuel 490 € ÷ 12 = 40,83 € (ses 2 mois offerts sont lissés). Tarifs HT, aucune TVA retranchée."
          />
          <AnimatedStat
            label="CA du mois (estimé)"
            value={mrrCents + commissionMonthCents}
            kind="currency"
            index={1}
            trend={pctTrend(
              mrrCents + commissionMonthCents,
              mrrCents + commissionPrevMonthCents,
              "vs mois dernier"
            )}
            info="MRR + commissions rattachées à ce mois. C'est un chiffre de pilotage, pas de la comptabilité : la compta officielle vit dans Stripe et tes factures."
          />
          <AnimatedStat
            label="Run-rate annuel"
            value={(mrrCents + commissionMonthCents) * 12}
            kind="currency"
            index={2}
            info="Projection : ce que ferait l'année si ce mois se répétait 12 fois à l'identique. Utile pour la trajectoire, à ne jamais présenter comme un CA réel."
          />
          <AnimatedStat
            label="Commissions ce mois-ci"
            value={commissionMonthCents}
            kind="currency"
            index={3}
            trend={pctTrend(commissionMonthCents, commissionPrevMonthCents, "vs mois dernier")}
            info="Les 5 % prélevés sur les coachs Basic, comptés le jour du versement au coach (pas le jour du paiement client) : c'est à ce moment que la commission naît, même règle que tes factures."
          />
          <AnimatedStat
            label="Volume traité (30 j)"
            value={gmv30Cents}
            kind="currency"
            index={4}
            trend={pctTrend(gmv30Cents, gmvPrev30Cents, "vs 30 j précédents")}
            info="Le GMV : tout ce que les clients ont payé aux coachs via Madger sur 30 jours. Cet argent transite, il ne t'appartient pas. Ton revenu = commissions + abonnements."
          />
          <AnimatedStat
            label="Commissions totales"
            value={commission}
            kind="currency"
            index={5}
            hint="Depuis le lancement"
          />
        </div>
      </section>

      {/* Répartition géographique des coachs (mood control room). */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-base">
              <span className="glow-dot h-2 w-2 rounded-full bg-accent" />
              Répartition des coachs
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Origine géographique des coachs inscrits (position du profil)
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              Pro ({proCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent/50" />
              Basic ({Math.max(0, points.length - proCount)})
            </span>
            {coaches - points.length > 0 && (
              <span className="text-text-dim">
                {coaches - points.length} sans position (ville non renseignée)
              </span>
            )}
          </div>
        </div>
        {points.length === 0 ? (
          <div className="flex h-[420px] items-center justify-center rounded-2xl border border-border bg-bg-card">
            <p className="max-w-xs text-center text-sm text-text-dim">
              La carte s'allume dès qu'un coach renseigne sa ville : chaque
              point est un coach.
            </p>
          </div>
        ) : (
          <AdminMap points={points} />
        )}
      </section>
    </>
  );
}
