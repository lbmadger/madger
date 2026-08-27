import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import AnimatedStat, {
  type StatKind,
  type StatTrend,
} from "@/components/dashboard/AnimatedStat";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import FirstBookingCard from "@/components/dashboard/FirstBookingCard";
import GoalCard from "@/components/dashboard/GoalCard";
import LeiaTips from "@/components/dashboard/LeiaTips";
import Leo from "@/components/ui/Leo";
import { SunIcon, MoonIcon, StarIcon } from "@/components/ui/icons";
import ProStats, { type ProStatItem } from "@/components/dashboard/ProStats";
import { computeLeiaTips, dailyTipIndex } from "@/lib/leia/tips";
import ChartCard from "@/components/dashboard/charts/ChartCard";
import AreaChartCard from "@/components/dashboard/charts/AreaChartCard";
import { type BarDatum } from "@/components/dashboard/charts/MiniBars";
import { invoiceNumber } from "@/lib/invoices/utils";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getCoach } from "@/lib/coach/getCoach";
import { isPro, proDaysLeft } from "@/lib/subscription/plan";
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

  // Bornes de demain (pour la salutation « X séances demain »).
  const tomorrowStart = new Date(now);
  tomorrowStart.setHours(0, 0, 0, 0);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowStart.getDate() + 1);

  const monthStartForClients = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // TOUTES les requêtes de la page partent en UNE seule vague parallèle
  // (dont le profil coach) : trois vagues séquentielles coûtaient trois
  // allers-retours vers Supabase au lieu d'un.
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
    { data: latestInvoices },
    reviewsRes,
    pendingRes,
    msgsRes,
    next30Res,
    monthSessionsRes,
    breakdownRes,
    totalBookingsRes,
    tomorrowRes,
    { coach },
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
    // Dernières factures, avis, demandes à confirmer, derniers messages
    // reçus, séances à venir sur 30 jours, séances du mois (objectif) et
    // encaissements du mois par prestation (répartition).
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
          "id, body, created_at, sender_id, conversation_id, conversations(client_name, coach_id, coach_last_read_at)"
        )
        .order("created_at", { ascending: false })
        .limit(30),
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
      // Séances du mois (réalisées + planifiées) : la jauge d'objectif.
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("starts_at", monthStart.toISOString())
        .lt("starts_at", nextMonthStart.toISOString())
        .neq("status", "cancelled")
        .eq("is_block", false),
      // Encaissements du mois par prestation (répartition).
      supabase
        .from("payments")
        .select("amount_cents, paid_at, services(name)")
        .eq("status", "paid")
        .gte("paid_at", monthStart.toISOString())
        .limit(1000),
      // Toutes séances confondues : sert uniquement à détecter LA première
      // réservation (célébrée en haut de page, une seule fois).
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("is_block", false)
        .neq("status", "cancelled"),
      // Séances de demain : quand la journée est vide, la salutation bascule
      // sur « X séances demain » au lieu d'un « 0 séance » déprimant.
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("starts_at", tomorrowStart.toISOString())
        .lt("starts_at", tomorrowEnd.toISOString())
        .neq("status", "cancelled")
        .eq("is_block", false),
      // Profil du coach (objectifs, checklist, salutation, plan).
      getCoach(),
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

  const pro = isPro(coach?.pro_until);

  // ── Objectif du mois + répartition par prestation ─────────────────────────
  const monthSessionsCount = monthSessionsRes.count ?? 0;
  const byService = new Map<string, number>();
  for (const p of breakdownRes.data ?? []) {
    const sv = Array.isArray(p.services) ? p.services[0] : p.services;
    const name = (sv?.name as string | undefined) || o.breakdownOther;
    byService.set(
      name,
      (byService.get(name) ?? 0) + ((p.amount_cents as number) || 0)
    );
  }
  const breakdownTotal = Array.from(byService.values()).reduce(
    (s, v) => s + v,
    0
  );
  const breakdown = Array.from(byService.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, cents]) => ({
      name,
      pct: Math.round((cents / breakdownTotal) * 100),
    }));
  {
    const rest =
      breakdownTotal -
      Array.from(byService.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .reduce((s, [, c]) => s + c, 0);
    if (rest > 0) {
      breakdown.push({
        name: o.breakdownOther,
        pct: Math.round((rest / breakdownTotal) * 100),
      });
    }
  }
  const monthLabel = now.toLocaleDateString(loc, { month: "long" });

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

  // Derniers messages REÇUS (envoyés par les clients, pas par le coach),
  // avec l'état non-lu (plus récent que la dernière lecture du coach) et le
  // lien direct vers la conversation.
  const receivedMsgs = (msgsRes.data ?? [])
    .filter((m) => m.sender_id !== coach?.id)
    .map((m) => {
      const conv = Array.isArray(m.conversations)
        ? m.conversations[0]
        : m.conversations;
      const lastRead = conv?.coach_last_read_at as string | null | undefined;
      return {
        id: m.id as string,
        body: m.body as string,
        created_at: m.created_at as string,
        convId: (m.conversation_id as string | null) ?? null,
        from: (conv?.client_name as string) || "-",
        unread: lastRead
          ? new Date(m.created_at as string).getTime() >
            new Date(lastRead).getTime()
          : true,
      };
    });
  // Une ligne par conversation (le message le plus récent, la liste arrive
  // triée du plus récent au plus ancien) : non-lus d'abord, sinon les 3
  // derniers échanges.
  const byConv = new Map<string, (typeof receivedMsgs)[number]>();
  for (const m of receivedMsgs) {
    const key = m.convId ?? m.id;
    if (!byConv.has(key)) byConv.set(key, m);
  }
  const convMsgs = Array.from(byConv.values());
  const unreadMsgs = convMsgs.filter((m) => m.unread);
  const msgPreview =
    unreadMsgs.length > 0 ? unreadMsgs.slice(0, 5) : convMsgs.slice(0, 3);
  const unreadCount = unreadMsgs.length;

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
  // Prochaine séance du jour (pas encore commencée) : donne une phrase
  // d'accueil vivante (« prochaine à 18h00 ») plutôt qu'un simple décompte.
  const todayNextAt = weekBookings
    .map((b) => new Date(b.starts_at as string))
    .filter((d) => d.getTime() >= now.getTime() && d.getTime() < todayEnd.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0];
  // Journée vide mais demain rempli : la salutation regarde devant.
  const tomorrowCount = tomorrowRes.count ?? 0;
  const tomorrowFirstAt = upcoming
    .map((b) => new Date(b.starts_at))
    .find(
      (d) =>
        d.getTime() >= tomorrowStart.getTime() &&
        d.getTime() < tomorrowEnd.getTime()
    );

  // Mini-widgets de la colonne droite : séances par jour (semaine courante)
  // et encaissements de la semaine.
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dEnd = new Date(d);
    dEnd.setDate(d.getDate() + 1);
    const count = weekBookings.filter((b) => {
      const t = new Date(b.starts_at as string).getTime();
      return t >= d.getTime() && t < dEnd.getTime();
    }).length;
    return {
      label: d.toLocaleDateString(loc, { weekday: "narrow" }),
      count,
      isToday: i === dow,
    };
  });
  const weekDayMax = Math.max(...weekDays.map((d) => d.count), 1);
  const weekRevenueCents = payments.reduce((s, p) => {
    const t = p.paid_at ? new Date(p.paid_at as string).getTime() : 0;
    return t >= weekStart.getTime()
      ? s + ((p.amount_cents as number) || 0)
      : s;
  }, 0);

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
        // La note moyenne vit déjà dans la colonne droite (widget) : ici,
        // une stat qui n'existe nulle part ailleurs.
        label: ps.sessions30,
        value: String(bookings30d),
        hint: ps.sessions30Hint,
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
              timeZone: coach?.timezone || "Europe/Paris",
            })}
            <span className="normal-case">
              {" "}
              {todayCount === 0 && !todayNextAt && tomorrowCount > 0
                ? `· ${tomorrowCount} ${o.sessionsTomorrow}${
                    tomorrowFirstAt
                      ? ` · ${o.firstAt} ${tomorrowFirstAt.toLocaleTimeString(loc, {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: coach?.timezone || "Europe/Paris",
                        })}`
                      : ""
                  }`
                : `· ${todayCount} ${o.sessionsToday}${
                    todayNextAt
                      ? ` · ${o.nextAt} ${todayNextAt.toLocaleTimeString(loc, {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: coach?.timezone || "Europe/Paris",
                        })}`
                      : ""
                  }`}
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

        {/* Première réservation de la vie du coach : on la fête. */}
        {(totalBookingsRes.count ?? 0) === 1 &&
          (() => {
            const first = upcoming[0];
            const cl = first?.clients ?? null;
            return (
              <FirstBookingCard
                clientName={
                  cl
                    ? [cl.first_name, cl.last_name].filter(Boolean).join(" ") ||
                      null
                    : null
                }
                dateStr={
                  first
                    ? new Date(first.starts_at).toLocaleString(loc, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: coach?.timezone || "Europe/Paris",
                      })
                    : null
                }
              />
            );
          })()}

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

        {/* Essai Pro offert en cours (Pro actif SANS abonnement payant) :
            rappel doux du temps restant, vers la page Abonnement. */}
        {pro &&
          !["active", "trialing"].includes(coach?.subscription_status ?? "") && (
            <Link
              href="/dashboard/abonnement"
              className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-4 py-3 transition-colors hover:border-accent/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-base">
                  {dict.plans.trialTitle}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {proDaysLeft(coach?.pro_until)} {dict.plans.daysLeft} ·{" "}
                  {dict.plans.trialDesc}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black">
                {dict.plans.trialCta}
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

        {/* Raccourcis mobiles : Paiements, Factures, Avis et Stats n'ont
            pas d'onglet dans la barre du bas, et le menu compte est un pur
            menu compte. Leur porte d'entrée mobile vit ICI, juste sous les
            stats, pas en fond de page où personne ne les trouvait. */}
        <div className="mt-3 grid grid-cols-4 gap-2 md:hidden">
          {[
            {
              href: "/dashboard/paiements",
              label: dict.nav.payments,
              d: "M2 8h20M5 5h14a3 3 0 013 3v8a3 3 0 01-3 3H5a3 3 0 01-3-3V8a3 3 0 013-3z",
            },
            {
              href: "/dashboard/factures",
              label: dict.nav.invoices,
              d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6",
            },
            {
              href: "/dashboard/avis",
              label: dict.nav.reviews,
              d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
            },
            {
              href: "/dashboard/stats",
              label: dict.nav.stats,
              d: "M18 20V10M12 20V4M6 20v-6",
            },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-bg-card px-1 py-3 text-xs font-medium text-text-muted transition-colors hover:border-accent/40 hover:text-text-base"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.d} />
              </svg>
              <span className="max-w-full truncate">{s.label}</span>
            </Link>
          ))}
        </div>

        {/* Héros revenus : grand chiffre du mois + graphique en aire animé.
            La pièce maîtresse visuelle de la vue d'ensemble. */}
        <div className="mt-4 sm:mt-5">
          <AreaChartCard
            title={o.chartRevenue}
            data={revenueByMonth}
            unit="currency"
            locale={loc}
            mode="months"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* flex-1 + flex-col : la carte s'étire pour que la colonne
                gauche fasse la même hauteur que la droite. Sans séance, ce
                serait sinon un trou noir sous la répartition des revenus. */}
            <section className="flex flex-1 flex-col rounded-2xl border border-border bg-bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-base">
                  {o.nextSessions}
                </h3>
                <Link
                  href="/dashboard/agenda"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {o.seeAll}
                </Link>
              </div>

              {upcoming.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                  <Leo pose="ok" size={84} />
                  <p className="text-sm text-text-dim">{o.noSessions}</p>
                  <Link
                    href="/dashboard/agenda"
                    className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-accent hover:text-text-base"
                  >
                    {dict.agenda.add}
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {upcoming.map((b) => (
                    <li key={b.id}>
                      {/* Carte cliquable : ouvre la fiche de la séance dans
                          l'agenda (lien profond ?b=). */}
                      <Link
                        href={`/dashboard/agenda?b=${b.id}`}
                        className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated p-3 transition-colors hover:border-accent/40"
                      >
                        <div className="flex w-14 shrink-0 flex-col">
                          {/* Fuseau du coach : le serveur tourne en UTC,
                              sans lui la séance de 9h30 s'affiche 7h30. */}
                          <span className="text-xs font-medium text-text-base">
                            {new Date(b.starts_at).toLocaleDateString(loc, {
                              day: "2-digit",
                              month: "short",
                              timeZone: coach?.timezone || "Europe/Paris",
                            })}
                          </span>
                          <span className="text-[11px] text-text-dim">
                            {new Date(b.starts_at).toLocaleTimeString(loc, {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: coach?.timezone || "Europe/Paris",
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
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Objectif du mois + répartition par prestation : côte à côte
                sous les séances, pour que la colonne gauche vive autant que
                la droite. L'édition de l'objectif vit dans Réglages ; sans
                objectif fixé (et sans encaissement), rien ne s'affiche. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 empty:hidden">
              {coach &&
                ((coach.monthly_revenue_goal_cents ?? 0) > 0 ||
                  (coach.monthly_sessions_goal ?? 0) > 0) && (
                <GoalCard
                  monthLabel={monthLabel}
                  revenueCents={monthRevenue}
                  sessionsCount={monthSessionsCount}
                  revenueGoalCents={coach.monthly_revenue_goal_cents}
                  sessionsGoal={coach.monthly_sessions_goal}
                  locale={loc}
                />
              )}
              {breakdown.length > 0 && breakdownTotal > 0 && (
                <section className="rounded-2xl border border-border bg-bg-card p-5">
                  <h3 className="text-base font-semibold text-text-base">
                    {o.breakdownTitle}
                    <span className="text-text-dim"> · {monthLabel}</span>
                  </h3>
                  <ul className="mt-3 flex flex-col gap-3">
                    {breakdown.map((b) => (
                      <li key={b.name}>
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="truncate text-xs text-text-muted">
                            {b.name}
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-text-base">
                            {b.pct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#9DCC00] to-accent"
                            style={{ width: `${Math.min(100, b.pct)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Checklist de démarrage : dans la colonne large, elle occupe
                l'espace tant que la configuration n'est pas terminée. */}
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
          </div>

          <div className="flex flex-col gap-4 lg:col-span-1">
            {/* Aperçu messagerie (comme le mockup landing) */}
            <section className="rounded-2xl border border-border bg-bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-text-base">
                  {dict.nav.messages}
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-black">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <Link
                  href="/dashboard/messages"
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {o.seeAll}
                </Link>
              </div>
              {msgPreview.length === 0 ? (
                <p className="mt-4 text-center text-sm text-text-dim">
                  {o.noMessages}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {msgPreview.map((m) => (
                    <li key={m.id}>
                      {/* Toute la carte est cliquable : direction la
                          conversation. Non-lu = liseré accent + point. */}
                      <Link
                        href={
                          m.convId
                            ? `/dashboard/messages/${m.convId}`
                            : "/dashboard/messages"
                        }
                        className={`block rounded-lg border p-2.5 transition-colors ${
                          m.unread
                            ? "border-accent/30 bg-accent/[0.05] hover:border-accent/60"
                            : "border-border bg-bg-elevated hover:border-accent/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-text-base">
                            {m.unread && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            )}
                            <span className="truncate">{m.from}</span>
                          </span>
                          <span className="shrink-0 text-[10px] text-text-dim">
                            {new Date(m.created_at).toLocaleTimeString(loc, {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: coach?.timezone || "Europe/Paris",
                            })}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 truncate text-xs ${
                            m.unread ? "text-text-base" : "text-text-muted"
                          }`}
                        >
                          {m.body}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Ta semaine : séances jour par jour (lun → dim) */}
            <section className="rounded-2xl border border-border bg-bg-card p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-text-base">
                  {o.weekLoad}
                </h3>

              </div>
              <div className="mt-3 flex h-20 items-end gap-1.5">
                {weekDays.map((d, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-1 flex-col items-center gap-1.5"
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t ${
                          d.count > 0
                            ? "bg-gradient-to-t from-[#9DCC00] to-accent"
                            : "bg-white/[0.06]"
                        }`}
                        style={{
                          height:
                            d.count > 0
                              ? `${Math.max(12, (d.count / weekDayMax) * 100)}%`
                              : "5px",
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] uppercase ${
                        d.isToday
                          ? "font-bold text-accent"
                          : "text-text-dim"
                      }`}
                    >
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Encaissé cette semaine + note moyenne */}
            <div className="grid grid-cols-2 gap-4">
              <section className="rounded-2xl border border-border bg-bg-card p-4">
                <h3 className="text-xs font-medium text-text-muted">
                  {o.weekRevenue}
                </h3>
                <p className="mt-2 font-display text-xl font-extrabold tracking-tight text-text-base">
                  {euros(weekRevenueCents)}
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#9DCC00] to-accent"
                    style={{
                      width: `${monthRevenue > 0 ? Math.min(100, Math.round((weekRevenueCents / monthRevenue) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </section>
              {/* Cliquable : mène à la page Avis (réponses, signalements). */}
              <Link
                href="/dashboard/avis"
                className="rounded-2xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/40"
              >
                <h3 className="text-xs font-medium text-text-muted">
                  {o.rating}
                </h3>
                <p className="mt-2 flex items-center gap-1.5 font-display text-xl font-extrabold tracking-tight text-text-base">
                  <StarIcon size={16} className="shrink-0 text-accent" />
                  {ratingCount > 0
                    ? ratingAvg.toLocaleString(loc, {
                        maximumFractionDigits: 1,
                      })
                    : "-"}
                </p>
                <p className="mt-2 text-[11px] text-text-dim">
                  {ratingCount} {dict.reviews.countLabel}
                </p>
              </Link>
            </div>

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
                  {o.seeAll}
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
                      <li key={p.id as string}>
                        {/* Toute la carte est cliquable, comme les
                            messages : direction la facture. */}
                        <Link
                          href={`/dashboard/factures/${p.id}`}
                          className="flex items-center gap-2.5 rounded-lg border border-border bg-bg-elevated p-2.5 transition-colors hover:border-accent/40"
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
                          <svg className="shrink-0 text-text-dim" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
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
