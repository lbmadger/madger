import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import AnimatedStat, {
  type StatKind,
  type StatTrend,
} from "@/components/dashboard/AnimatedStat";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import LeiaTips from "@/components/dashboard/LeiaTips";
import { SunIcon, MoonIcon } from "@/components/ui/icons";
import ProStats, { type ProStatItem } from "@/components/dashboard/ProStats";
import { computeLeiaTips, dailyTipIndex } from "@/lib/leia/tips";
import ChartCard from "@/components/dashboard/charts/ChartCard";
import AreaChartCard from "@/components/dashboard/charts/AreaChartCard";
import { type BarDatum } from "@/components/dashboard/charts/MiniBars";
import { invoiceNumber } from "@/lib/invoices/utils";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getCoach } from "@/lib/coach/getCoach";
import { isPro } from "@/lib/subscription/plan";
import type { Booking } from "@/lib/bookings/types";

// Vue d'ensemble — premier écran après connexion. KPI réels (revenus issus des
// paiements encaissés, fonds en séquestre) + graphiques revenus/séances.
export default async function OverviewPage() {
  const { dict, locale } = getServerDictionary();
  const o = dict.overview;
  const supabase = createClient();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";

  // Bornes de la semaine courante (lundi → dimanche).
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - dow);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const monthStartForClients = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    clientsRes,
    newClientsRes,
    upcomingRes,
    availRes,
    servicesRes,
    paymentsRes,
    heldRes,
    weeksRes,
    rpcMonthlyRes,
    rpcWeeklyRes,
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStartForClients.toISOString()),
    supabase
      .from("bookings")
      .select("*, clients(first_name, last_name)")
      .gte("ends_at", now.toISOString())
      .neq("status", "cancelled")
      .eq("is_block", false)
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase.from("availabilities").select("weekday, start_time, end_time"),
    supabase.from("services").select("type"),
    // Lignes brutes limitées à 12 mois (panier moyen, commission 30 j…) :
    // les graphiques longue durée passent par les agrégats SQL ci-dessous,
    // insensibles au plafond de 1000 lignes de PostgREST.
    supabase
      .from("payments")
      .select("amount_cents, paid_at, commission_cents, released_at")
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .gte(
        "paid_at",
        new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()
      )
      .limit(2000),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("escrow_status", "held"),
    // Lignes brutes limitées à 12 semaines (stats Pro, remplissage…) : le
    // graphique 52 semaines passe par l'agrégat SQL.
    supabase
      .from("bookings")
      .select("starts_at, ends_at, status, client_id")
      .eq("is_block", false)
      .lt("starts_at", weekEnd.toISOString())
      .gte(
        "starts_at",
        new Date(weekStart.getTime() - 12 * 7 * 86400000).toISOString()
      )
      .limit(2000),
    // Agrégats SQL (migration 0040) : exacts quel que soit le volume.
    supabase.rpc("coach_monthly_revenue", { p_months: 24 }),
    supabase.rpc("coach_weekly_sessions", { p_weeks: 52 }),
  ]);

  // Dernières factures, avis, demandes à confirmer, derniers messages reçus,
  // séances à venir sur 30 jours (revenus prévisionnels, stats Pro).
  const [{ data: latestInvoices }, reviewsRes, pendingRes, msgsRes, next30Res] =
    await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, amount_cents, currency, paid_at, clients(first_name, last_name)"
        )
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false })
        .limit(3),
      supabase.from("reviews").select("rating"),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .gte("ends_at", now.toISOString()),
      supabase
        .from("messages")
        .select(
          "id, body, created_at, sender_id, conversations(client_name, coach_id)"
        )
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("starts_at", now.toISOString())
        .lt(
          "starts_at",
          new Date(now.getTime() + 30 * 86400000).toISOString()
        )
        .neq("status", "cancelled")
        .eq("is_block", false),
    ]);

  const clientsCount = clientsRes.count ?? 0;
  // Séances de la semaine : dérivé de weeksRes (déjà borné < weekEnd et
  // filtré is_block), une requête count de moins par affichage.
  const weekCount = (weeksRes.data ?? []).filter(
    (b) =>
      b.status !== "cancelled" &&
      new Date(b.starts_at as string).getTime() >= weekStart.getTime()
  ).length;
  // Tendances : mêmes flèches que la page Statistiques, directement sur les
  // tuiles du Dashboard.
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekCount = (weeksRes.data ?? []).filter((b) => {
    if (b.status === "cancelled") return false;
    const t = new Date(b.starts_at as string).getTime();
    return t >= prevWeekStart.getTime() && t < weekStart.getTime();
  }).length;
  const sessionsTrend: StatTrend =
    prevWeekCount > 0
      ? {
          text: `${weekCount >= prevWeekCount ? "+" : ""}${Math.round(((weekCount - prevWeekCount) / prevWeekCount) * 100)}% ${o.vsLastWeek}`,
          positive: weekCount >= prevWeekCount,
        }
      : null;
  const newClientsCount = newClientsRes.count ?? 0;
  const clientsTrend: StatTrend =
    newClientsCount > 0
      ? { text: `+${newClientsCount} ${o.newThisMonth}`, positive: true }
      : null;
  const upcoming = (upcomingRes.data ?? []) as Booking[];
  const availRows = availRes.data ?? [];
  const availabilityDone = availRows.length > 0;
  const serviceRows = servicesRes.data ?? [];
  const servicesDone = serviceRows.length > 0;
  const pendingCount = pendingRes.count ?? 0;

  const { coach } = await getCoach();
  const pro = isPro(coach?.pro_until);

  // Checklist de démarrage : reflète l'état réel (photo + bio, dispos,
  // prestations, paiements Stripe).
  const profileDone = Boolean(coach?.avatar_url && (coach?.bio ?? "").trim());
  const stripeDone = Boolean(coach?.stripe_charges_enabled);
  const firstClientDone = clientsCount > 0;
  const firstBookingDone = (weeksRes.data ?? []).length > 0;
  const showChecklist =
    !profileDone ||
    !availabilityDone ||
    !servicesDone ||
    !stripeDone ||
    !firstClientDone ||
    !firstBookingDone;

  // Note moyenne du coach (avis clients).
  const ratings = (reviewsRes.data ?? []).map((r) => r.rating as number);
  const ratingCount = ratings.length;
  const ratingAvg =
    ratingCount > 0 ? ratings.reduce((s, r) => s + r, 0) / ratingCount : 0;

  // Derniers messages REÇUS (envoyés par les clients, pas par le coach).
  const receivedMsgs = (msgsRes.data ?? [])
    .filter((m) => m.sender_id !== coach?.id)
    .map((m) => ({
      id: m.id as string,
      body: m.body as string,
      created_at: m.created_at as string,
      from:
        ((Array.isArray(m.conversations)
          ? m.conversations[0]
          : m.conversations
        )?.client_name as string) || "-",
    }));
  const msgs24h = receivedMsgs.filter(
    (m) => Date.now() - new Date(m.created_at).getTime() < 24 * 3600 * 1000
  ).length;
  const msgPreview = receivedMsgs.slice(0, 3);

  const euros = (cents: number) =>
    (cents / 100).toLocaleString(loc, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    });

  // ── Revenus par mois (depuis le premier encaissement, 12 mois min, 24 max) ─
  const payments = paymentsRes.data ?? [];

  // Commission Madger réellement prélevée sur les 30 derniers jours, datée
  // du versement (released_at) : c'est là que la commission naît. Alimente
  // la bannière Pro chiffrée et évite le doublon avec le conseil Leia.
  const commission30d = payments.reduce((s, p) => {
    const c = ((p as { commission_cents?: number | null }).commission_cents ??
      0) as number;
    if (c <= 0) return s;
    const at =
      ((p as { released_at?: string | null }).released_at as string | null) ??
      (p.paid_at as string | null);
    if (!at || new Date(at).getTime() < now.getTime() - 30 * 86400000)
      return s;
    return s + c;
  }, 0);
  // Agrégat SQL prioritaire (exact à tout volume) ; repli sur les lignes
  // brutes tant que la migration 0040 n'est pas passée.
  const rpcMonths = !rpcMonthlyRes.error
    ? ((rpcMonthlyRes.data ?? []) as { month: string; total_cents: number }[])
    : null;
  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const rpcMonthMap = new Map(
    (rpcMonths ?? []).map((r) => {
      const d = new Date(r.month);
      return [monthKey(d), Number(r.total_cents) || 0];
    })
  );
  const firstPaid = rpcMonths?.length
    ? new Date(rpcMonths[0].month).getTime()
    : payments.reduce<number | null>((min, p) => {
        const t = new Date(p.paid_at as string).getTime();
        return min === null || t < min ? t : min;
      }, null);
  const monthsSinceFirst = firstPaid
    ? (now.getFullYear() - new Date(firstPaid).getFullYear()) * 12 +
      (now.getMonth() - new Date(firstPaid).getMonth()) +
      1
    : 0;
  const monthsBack = Math.min(24, Math.max(12, monthsSinceFirst));
  const revenueByMonth: BarDatum[] = Array.from(
    { length: monthsBack },
    (_, i) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - (monthsBack - 1) + i,
        1
      );
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const sum = rpcMonths
        ? rpcMonthMap.get(monthKey(d)) ?? 0
        : payments
            .filter((p) => {
              const t = p.paid_at
                ? new Date(p.paid_at as string).getTime()
                : 0;
              return t >= d.getTime() && t < next.getTime();
            })
            .reduce((s, p) => s + ((p.amount_cents as number) || 0), 0);
      return {
        label: d.toLocaleDateString(loc, { month: "short" }),
        value: sum,
      };
    }
  );
  const monthRevenue = revenueByMonth[revenueByMonth.length - 1].value;
  const lastMonthRevenue = revenueByMonth[revenueByMonth.length - 2].value;
  const revenueTrend: StatTrend =
    lastMonthRevenue > 0
      ? {
          text: `${monthRevenue >= lastMonthRevenue ? "+" : ""}${Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)}% ${o.vsLastMonth}`,
          positive: monthRevenue >= lastMonthRevenue,
        }
      : null;

  const heldSum = (heldRes.data ?? []).reduce(
    (s, p) => s + ((p.amount_cents as number) || 0),
    0
  );

  // ── Séances par semaine : agrégat SQL prioritaire, repli lignes brutes ──
  const weekBookings = (weeksRes.data ?? []).filter(
    (b) => b.status !== "cancelled"
  );
  const rpcWeeks = !rpcWeeklyRes.error
    ? ((rpcWeeklyRes.data ?? []) as { week: string; sessions: number }[])
    : null;
  const weekKey = (d: Date) => {
    const k = new Date(d);
    k.setHours(0, 0, 0, 0);
    k.setDate(k.getDate() - ((k.getDay() + 6) % 7));
    return `${k.getFullYear()}-${k.getMonth()}-${k.getDate()}`;
  };
  const rpcWeekMap = new Map(
    (rpcWeeks ?? []).map((r) => [
      weekKey(new Date(r.week)),
      Number(r.sessions) || 0,
    ])
  );
  const firstBooking = rpcWeeks?.length
    ? new Date(rpcWeeks[0].week).getTime()
    : weekBookings.reduce<number | null>((min, b) => {
        const t = new Date(b.starts_at as string).getTime();
        return min === null || t < min ? t : min;
      }, null);
  const weeksSinceFirst = firstBooking
    ? Math.floor((weekStart.getTime() - firstBooking) / (7 * 86400000)) + 1
    : 0;
  const weeksBack = Math.min(52, Math.max(12, weeksSinceFirst));
  const sessionsByWeek: BarDatum[] = Array.from({ length: weeksBack }, (_, i) => {
    const start = new Date(weekStart);
    start.setDate(weekStart.getDate() - 7 * (weeksBack - 1 - i));
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = rpcWeeks
      ? rpcWeekMap.get(weekKey(start)) ?? 0
      : weekBookings.filter((b) => {
          const t = new Date(b.starts_at as string).getTime();
          return t >= start.getTime() && t < end.getTime();
        }).length;
    return {
      label: start.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" }),
      value: count,
    };
  });

  // ── Aujourd'hui + taux de remplissage (heures réservées / heures ouvertes) ─
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayStart.getDate() + 1);
  const todayCount = weekBookings.filter((b) => {
    const t = new Date(b.starts_at as string).getTime();
    return t >= todayStart.getTime() && t < todayEnd.getTime();
  }).length;

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const availableMinutes = availRows.reduce(
    (s, a) => s + Math.max(0, toMin(a.end_time as string) - toMin(a.start_time as string)),
    0
  );
  const bookedMinutes = weekBookings
    .filter((b) => {
      const t = new Date(b.starts_at as string).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    })
    .reduce(
      (s, b) =>
        s +
        Math.max(
          0,
          (new Date(b.ends_at as string).getTime() -
            new Date(b.starts_at as string).getTime()) /
            60000
        ),
      0
    );
  const fillRate =
    availableMinutes > 0
      ? Math.min(100, Math.round((bookedMinutes / availableMinutes) * 100))
      : null;

  // ── Conseils de Leia (personnalisés selon le profil et l'activité) ────────
  const bookings30d = weekBookings.filter((b) => {
    const t = new Date(b.starts_at as string).getTime();
    return t >= now.getTime() - 30 * 86400000;
  }).length;
  const leiaTips = computeLeiaTips({
    hasPhoto: Boolean(coach?.avatar_url),
    bioLength: (coach?.bio ?? "").trim().length,
    hasCity: Boolean(coach?.city),
    hasSport: Boolean(coach?.sport),
    servicesCount: serviceRows.length,
    hasPack: serviceRows.some((s) => s.type === "pack"),
    availabilityCount: availRows.length,
    bookingMode: coach?.booking_mode ?? "instant",
    reviewsCount: ratingCount,
    ratingAvg,
    bookings30d,
    isPro: pro,
    paidCount: payments.length,
  }).filter(
    // La bannière Pro chiffrée dit déjà « 0 % de commission » : on ne
    // répète pas le même argument dans les conseils Leia.
    (tip) => !(tip.id === "pro" && commission30d > 0)
  );
  const leiaDailyIndex = dailyTipIndex(now);


  // ── Tuiles KPI (compteurs animés) ─────────────────────────────────────────
  // 4 tuiles, une info chacune, zéro doublon : le mois (argent), la semaine
  // (activité, avec le jour en sous-titre), les clients, le séquestre. Les
  // demandes à confirmer ont déjà leur bannière en haut, les messages leur
  // bloc dédié juste en dessous.
  const stats: {
    label: string;
    value: number;
    kind: StatKind;
    trend?: StatTrend;
    hint?: string;
    prefix?: string;
    href?: string;
  }[] = [
    {
      label: o.revenueMonth,
      value: monthRevenue,
      kind: "currency",
      trend: revenueTrend,
    },
    {
      label: o.sessionsWeek,
      value: weekCount,
      kind: "int",
      trend: sessionsTrend,
      hint: `${todayCount} ${o.sessionsToday}`,
      href: "/dashboard/agenda",
    },
    {
      label: o.activeClients,
      value: clientsCount,
      kind: "int",
      trend: clientsTrend,
      href: "/dashboard/clients",
    },
    {
      label: o.pendingPayments,
      value: heldSum,
      kind: "currency",
      href: "/dashboard/paiements",
    },
  ];
  // ── Statistiques avancées (plan Pro) ──────────────────────────────────────
  // Calculées pour tout le monde : en Gratuit elles sont floutées avec un
  // cadenas, mais ce sont les VRAIES valeurs du coach qui se devinent sous le
  // flou. « Débloque TES chiffres » vend mieux qu'un décor générique.
  const ps = o.proStats;
  let proItems: ProStatItem[];
  {
    const allRows = weeksRes.data ?? [];
    const totalPaidCents = payments.reduce(
      (s, p) => s + ((p.amount_cents as number) || 0),
      0
    );
    const avgBasketCents =
      payments.length > 0 ? Math.round(totalPaidCents / payments.length) : 0;

    // Taux d'annulation sur les 30 derniers jours (toutes séances confondues).
    const last30 = allRows.filter((b) => {
      const t = new Date(b.starts_at as string).getTime();
      return t >= now.getTime() - 30 * 86400000 && t <= now.getTime();
    });
    const cancelRate =
      last30.length > 0
        ? Math.round(
            (last30.filter((b) => b.status === "cancelled").length /
              last30.length) *
              100
          )
        : 0;

    // Jour le plus réservé (lundi = 0) et heure la plus demandée, dans le
    // fuseau du coach.
    const dayCounts = Array.from({ length: 7 }, () => 0);
    const hourCounts = new Map<number, number>();
    const hourFmt = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: coach?.timezone || "Europe/Paris",
    });
    for (const b of weekBookings) {
      const d = new Date(b.starts_at as string);
      dayCounts[(d.getDay() + 6) % 7] += 1;
      const h = parseInt(hourFmt.format(d), 10);
      if (!Number.isNaN(h)) hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    }
    const bestDayIdx = dayCounts.some((c) => c > 0)
      ? dayCounts.indexOf(Math.max(...dayCounts))
      : -1;
    // Le 1er janvier 2024 était un lundi : sert de référence pour le libellé.
    const bestDay =
      bestDayIdx >= 0
        ? new Date(Date.UTC(2024, 0, 1 + bestDayIdx)).toLocaleDateString(loc, {
            weekday: "long",
          })
        : "-";
    let bestHour = "-";
    let bestHourCount = 0;
    hourCounts.forEach((c, h) => {
      if (c > bestHourCount) {
        bestHourCount = c;
        bestHour = `${String(h).padStart(2, "0")}:00`;
      }
    });

    // Fidélité : part des clients revenus au moins une deuxième fois.
    const byClient = new Map<string, number>();
    for (const b of weekBookings) {
      const id = b.client_id as string | null;
      if (id) byClient.set(id, (byClient.get(id) ?? 0) + 1);
    }
    let loyalCount = 0;
    byClient.forEach((n) => {
      if (n >= 2) loyalCount += 1;
    });
    const loyalPct =
      byClient.size > 0 ? Math.round((loyalCount / byClient.size) * 100) : 0;

    const forecastCents = (next30Res.count ?? 0) * avgBasketCents;

    proItems = [
      {
        label: o.fillRate,
        value: fillRate !== null ? `${fillRate}%` : "-",
        hint: o.fillRateHint,
      },
      {
        label: o.rating,
        value:
          ratingCount > 0
            ? `${ratingAvg.toLocaleString(loc, { maximumFractionDigits: 1 })} / 5`
            : "-",
        hint:
          ratingCount > 0
            ? `${ratingCount} ${dict.reviews.countLabel}`
            : undefined,
      },
      {
        label: ps.avgBasket,
        value: avgBasketCents > 0 ? euros(avgBasketCents) : "-",
        hint: ps.avgBasketHint,
      },
      {
        label: ps.cancelRate,
        value: last30.length > 0 ? `${cancelRate}%` : "-",
        hint: ps.cancelRateHint,
      },
      { label: ps.bestDay, value: bestDay, hint: ps.bestDayHint },
      { label: ps.bestHour, value: bestHour, hint: ps.bestHourHint },
      {
        label: ps.loyalClients,
        value: byClient.size > 0 ? `${loyalPct}%` : "-",
        hint: ps.loyalHint,
      },
      {
        label: ps.forecast,
        value: forecastCents > 0 ? euros(forecastCents) : "-",
        hint: ps.forecastHint,
      },
    ];
  }

  return (
    <>
      <Topbar title={o.title} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          {(() => {
            // Salutation selon l'heure locale du coach : Bonjour la journée,
            // Bonsoir le soir (icône soleil / lune assortie).
            const h = parseInt(
              new Intl.DateTimeFormat("en-GB", {
                hour: "numeric",
                hour12: false,
                timeZone: coach?.timezone || "Europe/Paris",
              }).format(now),
              10
            );
            const evening = h >= 18 || h < 5;
            return (
              <h2 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-text-base sm:text-3xl">
                {evening ? (
                  <MoonIcon size={24} className="shrink-0 text-accent" />
                ) : (
                  <SunIcon size={24} className="shrink-0 text-accent" />
                )}
                <span>
                  {evening ? o.greetingEvening : o.greetingMorning}
                  {coach?.first_name ? ` ${coach.first_name}` : ""}
                </span>
              </h2>
            );
          })()}
          {/* Comme le mockup : date du jour + séances du jour */}
          <p className="mt-1 text-sm capitalize text-text-muted">
            {now.toLocaleDateString(loc, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            <span className="normal-case">
              {" "}
              · {todayCount} {o.sessionsToday}
            </span>
          </p>
        </div>

        {/* Demandes en attente : l'action n°1, affichée avant tout le reste
            (sur mobile la page est longue, pas question de la faire défiler). */}
        {pendingCount > 0 && (
          <Link
            href="/dashboard/agenda"
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/[0.06] px-4 py-3 transition-colors hover:border-warning/50"
          >
            <p className="text-sm font-semibold text-text-base">
              {pendingCount}{" "}
              {pendingCount > 1
                ? dict.agenda.pendingBannerPlural
                : dict.agenda.pendingBanner}
            </p>
            <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black">
              {dict.agenda.confirm}
            </span>
          </Link>
        )}

        {/* Conseils de Leia : bande fine dépliable, tout en haut */}
        <LeiaTips tips={leiaTips} dailyIndex={leiaDailyIndex} />

        {/* Relance vers l'offre Pro (coachs en Free uniquement). Chiffrée dès
            que de la commission a été prélevée sur 30 jours : le coach voit
            SON argent, pas un slogan. */}
        {!pro && (
          <Link
            href="/dashboard/abonnement"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-4 py-3 transition-colors hover:border-accent/40"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-base">
                {commission30d > 0
                  ? `${dict.plans.upsellComputedTitle} ${euros(commission30d)}`
                  : dict.plans.upsellTitle}
              </p>
              <p className="truncate text-xs text-text-muted">
                {/* Au-delà du prix du Pro, on affiche le gain NET : c'est le
                    chiffre qui déclenche la décision. */}
                {commission30d > 4900
                  ? `${dict.plans.upsellNetIntro} ${euros(commission30d - 4900)}.`
                  : commission30d > 0
                  ? dict.plans.upsellComputedDesc
                  : dict.plans.upsellDesc}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black">
              {dict.plans.upsellCta}
            </span>
          </Link>
        )}

        {/* KPI animés (compteurs) : 2 colonnes mobile, 4 desktop */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s, i) => {
            const tile = (
              <AnimatedStat
                label={s.label}
                value={s.value}
                kind={s.kind}
                locale={loc}
                trend={s.trend ?? null}
                hint={s.hint}
                prefix={s.prefix}
                index={i}
              />
            );
            return s.href ? (
              <Link
                key={s.label}
                href={s.href}
                className="block h-full transition-transform hover:-translate-y-0.5"
              >
                {tile}
              </Link>
            ) : (
              <div key={s.label} className="h-full">
                {tile}
              </div>
            );
          })}
        </div>

        {/* Héros revenus : grand chiffre du mois + graphique en aire animé.
            La pièce maîtresse visuelle de la vue d'ensemble. */}
        <div className="mt-4 sm:mt-5">
          <AreaChartCard
            title={o.chartRevenue}
            headline={euros(monthRevenue)}
            trend={revenueTrend}
            data={revenueByMonth}
            unit="currency"
            locale={loc}
            mode="months"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <section className="rounded-2xl border border-border bg-bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-base">
                  {o.nextSessions}
                </h3>
                <Link
                  href="/dashboard/agenda"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {dict.agenda.title}
                </Link>
              </div>

              {upcoming.length === 0 ? (
                <p className="mt-6 text-center text-sm text-text-dim">
                  {o.noSessions}
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {upcoming.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated p-3"
                    >
                      <div className="flex w-14 shrink-0 flex-col">
                        <span className="text-xs font-medium text-text-base">
                          {new Date(b.starts_at).toLocaleDateString(loc, {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                        <span className="text-[11px] text-text-dim">
                          {new Date(b.starts_at).toLocaleTimeString(loc, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-base">
                        {b.clients
                          ? [b.clients.first_name, b.clients.last_name]
                              .filter(Boolean)
                              .join(" ")
                          : "-"}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          b.location === "online"
                            ? "bg-accent/10 text-accent"
                            : "border border-border-strong text-text-muted"
                        }`}
                      >
                        {dict.agenda.badge[b.location]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-1">
            {/* Aperçu messagerie (comme le mockup landing) */}
            <section className="rounded-2xl border border-border bg-bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-text-base">
                  {dict.nav.messages}
                  {msgs24h > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-black">
                      {msgs24h}
                    </span>
                  )}
                </h3>
                <Link
                  href="/dashboard/messages"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {o.allInvoices}
                </Link>
              </div>
              {msgPreview.length === 0 ? (
                <p className="mt-4 text-center text-sm text-text-dim">
                  {o.noMessages}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {msgPreview.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-lg border border-border bg-bg-elevated p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-text-base">
                          {m.from}
                        </span>
                        <span className="shrink-0 text-[10px] text-text-dim">
                          {new Date(m.created_at).toLocaleTimeString(loc, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        {m.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {showChecklist && (
              <SetupChecklist
                profileDone={profileDone}
                availabilityDone={availabilityDone}
                servicesDone={servicesDone}
                stripeDone={stripeDone}
                clientDone={firstClientDone}
                bookingDone={firstBookingDone}
              />
            )}

            {/* Dernières factures + téléchargement */}
            <section className="rounded-2xl border border-border bg-bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-base">
                  {o.latestInvoices}
                </h3>
                <Link
                  href="/dashboard/factures"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {o.allInvoices}
                </Link>
              </div>
              {(latestInvoices ?? []).length === 0 ? (
                <p className="mt-4 text-center text-sm text-text-dim">
                  {o.noInvoices}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {(latestInvoices ?? []).map((p) => {
                    const cl = Array.isArray(p.clients)
                      ? p.clients[0]
                      : p.clients;
                    return (
                      <li
                        key={p.id as string}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-bg-elevated p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-text-base">
                            {invoiceNumber(p.id as string, p.paid_at as string)}
                          </p>
                          <p className="truncate text-[11px] text-text-dim">
                            {[cl?.first_name, cl?.last_name]
                              .filter(Boolean)
                              .join(" ") || "-"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-text-base">
                          {euros((p.amount_cents as number) || 0)}
                        </span>
                        <Link
                          href={`/dashboard/factures/${p.id}`}
                          aria-label={dict.invoices.download}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-text-muted transition-colors hover:border-accent hover:text-accent"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                          </svg>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* Statistiques avancées : floutées + cadenas en Gratuit, réelles en
            Pro. */}
        <ProStats items={proItems} locked={!pro} />

        {/* Séances par semaine (le revenu a désormais son héros en aire plus
            haut) : les barres conviennent bien à un décompte. */}
        <div className="mt-4 sm:mt-5">
          <ChartCard
            title={o.chartSessions}
            data={sessionsByWeek}
            locale={loc}
            mode="weeks"
          />
        </div>
      </main>
    </>
  );
}
