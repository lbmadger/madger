import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import StatCard, { type Trend } from "@/components/dashboard/StatCard";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import MiniBars, { type BarDatum } from "@/components/dashboard/charts/MiniBars";
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
  const loc = locale === "fr" ? "fr-FR" : "en-US";

  // Bornes de la semaine courante (lundi → dimanche).
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - dow);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Fenêtres des graphiques : 6 mois (revenus) et 8 semaines (séances).
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const eightWeeksAgo = new Date(weekStart);
  eightWeeksAgo.setDate(weekStart.getDate() - 7 * 7);

  const [
    clientsRes,
    weekRes,
    upcomingRes,
    availRes,
    servicesRes,
    paymentsRes,
    heldRes,
    weeksRes,
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString()),
    supabase
      .from("bookings")
      .select("*, clients(first_name, last_name)")
      .gte("ends_at", now.toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase.from("availabilities").select("*", { count: "exact", head: true }),
    supabase.from("services").select("*", { count: "exact", head: true }),
    supabase
      .from("payments")
      .select("amount_cents, paid_at")
      .eq("status", "paid")
      .gte("paid_at", sixMonthsAgo.toISOString()),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("escrow_status", "held"),
    supabase
      .from("bookings")
      .select("starts_at, status")
      .gte("starts_at", eightWeeksAgo.toISOString())
      .lt("starts_at", weekEnd.toISOString()),
  ]);

  const clientsCount = clientsRes.count ?? 0;
  const weekCount = weekRes.count ?? 0;
  const upcoming = (upcomingRes.data ?? []) as Booking[];
  const availabilityDone = (availRes.count ?? 0) > 0;
  const servicesDone = (servicesRes.count ?? 0) > 0;
  const showChecklist = !availabilityDone || !servicesDone;

  const { coach } = await getCoach();
  const pro = isPro(coach?.pro_until);

  const euros = (cents: number) =>
    (cents / 100).toLocaleString(loc, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    });

  // ── Revenus par mois (6 derniers mois) ────────────────────────────────────
  const payments = paymentsRes.data ?? [];
  const revenueByMonth: BarDatum[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const sum = payments
      .filter((p) => {
        const t = p.paid_at ? new Date(p.paid_at as string).getTime() : 0;
        return t >= d.getTime() && t < next.getTime();
      })
      .reduce((s, p) => s + ((p.amount_cents as number) || 0), 0);
    return { label: d.toLocaleDateString(loc, { month: "short" }), value: sum };
  });
  const monthRevenue = revenueByMonth[5].value;
  const lastMonthRevenue = revenueByMonth[4].value;
  const revenueTrend: Trend =
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

  // ── Séances par semaine (8 dernières semaines) ────────────────────────────
  const weekBookings = (weeksRes.data ?? []).filter(
    (b) => b.status !== "cancelled"
  );
  const sessionsByWeek: BarDatum[] = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(weekStart);
    start.setDate(weekStart.getDate() - 7 * (7 - i));
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = weekBookings.filter((b) => {
      const t = new Date(b.starts_at as string).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    return {
      label: start.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" }),
      value: count,
    };
  });

  const stats: { label: string; value: string; trend?: Trend }[] = [
    { label: o.revenueMonth, value: euros(monthRevenue), trend: revenueTrend },
    { label: o.sessionsWeek, value: String(weekCount) },
    { label: o.activeClients, value: String(clientsCount) },
    { label: o.pendingPayments, value: euros(heldSum) },
  ];

  return (
    <>
      <Topbar title={o.title} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-text-base sm:text-3xl">
            {o.greeting} 👋
          </h2>
          <p className="mt-1 text-sm text-text-muted">{o.subtitle}</p>
        </div>

        {/* Relance vers l'offre Pro (coachs en Free uniquement) */}
        {!pro && (
          <Link
            href="/dashboard/abonnement"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-4 py-3 transition-colors hover:border-accent/40"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-base">
                {dict.plans.upsellTitle}
              </p>
              <p className="truncate text-xs text-text-muted">
                {dict.plans.upsellDesc}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black">
              {dict.plans.upsellCta}
            </span>
          </Link>
        )}

        {/* KPI en 2×2 sur mobile, 4 colonnes sur desktop */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              trend={s.trend ?? null}
            />
          ))}
        </div>

        {/* Graphiques : revenus 6 mois + séances 8 semaines */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">
          <section className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-text-dim">
              {o.chartRevenue}
            </h3>
            <MiniBars data={revenueByMonth} unit="currency" locale={loc} />
          </section>
          <section className="rounded-2xl border border-border bg-bg-card p-4 sm:p-5">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-text-dim">
              {o.chartSessions}
            </h3>
            <MiniBars data={sessionsByWeek} locale={loc} />
          </section>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className={showChecklist ? "lg:col-span-2" : "lg:col-span-3"}>
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
                          : "—"}
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

          {showChecklist && (
            <div className="lg:col-span-1">
              <SetupChecklist
                availabilityDone={availabilityDone}
                servicesDone={servicesDone}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
