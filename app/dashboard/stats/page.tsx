import Topbar from "@/components/dashboard/Topbar";
import StatCard, { type Trend } from "@/components/dashboard/StatCard";
import AreaChartCard from "@/components/dashboard/charts/AreaChartCard";
import ChartCard from "@/components/dashboard/charts/ChartCard";
import { type BarDatum } from "@/components/dashboard/charts/MiniBars";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";

type Status = "pending" | "confirmed" | "completed" | "cancelled";
type Booking = { starts_at: string; ends_at: string; status: Status };
type ClientRow = { created_at: string };

// Page Statistiques : les KPI comparés au mois dernier, puis les graphiques
// (revenus 12 mois en aire, séances par semaine, donut des statuts, jours de
// la semaine, revenus par prestation). Les composants de graphes sont ceux
// du dashboard : même langage visuel partout.
export default async function StatsPage() {
  const { dict, locale } = getServerDictionary();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const s = dict.stats;
  const supabase = createClient();

  const now = new Date();
  const nowMs = now.getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // Historique borné à 1 an : suffisant pour toutes les stats affichées.
  const yearAgo = new Date(nowMs - 366 * 86400000).toISOString();

  const [clientsRes, bookingsRes, paymentsRes, rpcMonthlyRes, rpcWeeklyRes, svcRes] =
    await Promise.all([
      supabase.from("clients").select("created_at"),
      supabase
        .from("bookings")
        .select("starts_at, ends_at, status")
        .eq("is_block", false)
        .gte("starts_at", yearAgo),
      supabase
        .from("payments")
        .select("amount_cents, paid_at")
        .eq("status", "paid")
        .gte("paid_at", lastMonthStart.toISOString()),
      // Agrégats SQL (migration 0040) : exacts à tout volume.
      supabase.rpc("coach_monthly_revenue", { p_months: 12 }),
      supabase.rpc("coach_weekly_sessions", { p_weeks: 12 }),
      // Revenus par prestation sur 12 mois.
      supabase
        .from("payments")
        .select("amount_cents, services(name)")
        .eq("status", "paid")
        .gte("paid_at", yearAgo)
        .limit(2000),
    ]);

  const clients = (clientsRes.data ?? []) as ClientRow[];
  const bookings = (bookingsRes.data ?? []) as Booking[];
  const payments = (paymentsRes.data ?? []) as {
    amount_cents: number;
    paid_at: string | null;
  }[];

  // Revenus du mois (encaissés) et tendance vs mois dernier.
  const paidIn = (a: Date, b: Date) =>
    payments
      .filter((p) => {
        const t = p.paid_at ? new Date(p.paid_at).getTime() : 0;
        return t >= a.getTime() && t < b.getTime();
      })
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0);
  const revenueMonth = paidIn(monthStart, monthEnd);
  const revenueLastMonth = paidIn(lastMonthStart, monthStart);

  const inRange = (iso: string, a: Date, b: Date) => {
    const t = new Date(iso).getTime();
    return t >= a.getTime() && t < b.getTime();
  };

  // ── Tendance +X% / −X% ───────────────────────────────────────────────────
  const trend = (cur: number, prev: number): Trend => {
    if (prev === 0) return cur > 0 ? { text: s.badgeNew, positive: true } : null;
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { text: `${pct >= 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
  };

  // ── Séances ──────────────────────────────────────────────────────────────
  const active = bookings.filter((b) => b.status !== "cancelled");
  const sessionsMonth = active.filter((b) =>
    inRange(b.starts_at, monthStart, monthEnd)
  ).length;
  const sessionsLastMonth = active.filter((b) =>
    inRange(b.starts_at, lastMonthStart, monthStart)
  ).length;

  // ── Clients ──────────────────────────────────────────────────────────────
  const newClientsMonth = clients.filter((c) =>
    inRange(c.created_at, monthStart, monthEnd)
  ).length;
  const newClientsLastMonth = clients.filter((c) =>
    inRange(c.created_at, lastMonthStart, monthStart)
  ).length;

  // ── Statuts (non chevauchants) ──────────────────────────────────────────
  const pending = bookings.filter((b) => b.status === "pending").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const realized = bookings.filter(
    (b) =>
      b.status === "completed" ||
      (b.status === "confirmed" && new Date(b.ends_at).getTime() < nowMs)
  ).length;
  const confirmedUpcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.ends_at).getTime() >= nowMs
  ).length;
  const total = bookings.length;
  const upcoming = active.filter(
    (b) => new Date(b.ends_at).getTime() >= nowMs
  ).length;

  const confirmRate = total
    ? Math.round(((confirmedUpcoming + realized) / total) * 100)
    : 0;
  const cancelRate = total ? Math.round((cancelled / total) * 100) : 0;

  // ── Revenus par mois (12 derniers), agrégat SQL prioritaire ──────────────
  const rpcMonths = !rpcMonthlyRes.error
    ? ((rpcMonthlyRes.data ?? []) as { month: string; total_cents: number }[])
    : [];
  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const rpcMonthMap = new Map(
    rpcMonths.map((r) => {
      const d = new Date(r.month);
      return [monthKey(d), Number(r.total_cents) || 0];
    })
  );
  const revenueByMonth: BarDatum[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      label: d.toLocaleDateString(loc, { month: "short" }),
      value: rpcMonthMap.get(monthKey(d)) ?? 0,
    };
  });
  // Le mois courant vient des paiements frais (le RPC peut dater du cache).
  revenueByMonth[revenueByMonth.length - 1].value = Math.max(
    revenueByMonth[revenueByMonth.length - 1].value,
    revenueMonth
  );

  // ── Séances par semaine (12 dernières), agrégat SQL prioritaire ──────────
  const dow = (now.getDay() + 6) % 7;
  const curWeekStart = new Date(now);
  curWeekStart.setHours(0, 0, 0, 0);
  curWeekStart.setDate(now.getDate() - dow);
  const weekKey = (d: Date) => {
    const k = new Date(d);
    k.setHours(0, 0, 0, 0);
    k.setDate(k.getDate() - ((k.getDay() + 6) % 7));
    return `${k.getFullYear()}-${k.getMonth()}-${k.getDate()}`;
  };
  const rpcWeeks = !rpcWeeklyRes.error
    ? ((rpcWeeklyRes.data ?? []) as { week: string; sessions: number }[])
    : null;
  const rpcWeekMap = new Map(
    (rpcWeeks ?? []).map((r) => [weekKey(new Date(r.week)), Number(r.sessions) || 0])
  );
  const sessionsByWeek: BarDatum[] = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(curWeekStart);
    start.setDate(curWeekStart.getDate() - 7 * (11 - i));
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = rpcWeeks
      ? rpcWeekMap.get(weekKey(start)) ?? 0
      : active.filter((b) => {
          const t = new Date(b.starts_at).getTime();
          return t >= start.getTime() && t < end.getTime();
        }).length;
    return {
      label: start.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" }),
      value: count,
    };
  });

  // ── Séances par jour de la semaine (12 mois) ─────────────────────────────
  const weekdayCounts = Array.from({ length: 7 }, () => 0);
  for (const b of active) {
    weekdayCounts[(new Date(b.starts_at).getDay() + 6) % 7] += 1;
  }
  const weekdayMax = Math.max(...weekdayCounts, 1);
  // Le 1er janvier 2024 était un lundi : référence pour les initiales.
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(loc, {
      weekday: "narrow",
    })
  );

  // ── Revenus par prestation (12 mois) : top 4 + Autres ────────────────────
  const byService = new Map<string, number>();
  for (const p of svcRes.data ?? []) {
    const sv = Array.isArray(p.services) ? p.services[0] : p.services;
    const name =
      ((sv as { name?: string } | null)?.name as string) ||
      dict.overview.breakdownOther;
    byService.set(name, (byService.get(name) ?? 0) + ((p.amount_cents as number) || 0));
  }
  const svcTotal = Array.from(byService.values()).reduce((a, b) => a + b, 0);
  const svcSorted = Array.from(byService.entries()).sort((a, b) => b[1] - a[1]);
  const svcRows = svcSorted.slice(0, 4).map(([name, cents]) => ({ name, cents }));
  const svcRest = svcTotal - svcRows.reduce((a, r) => a + r.cents, 0);
  if (svcRest > 0)
    svcRows.push({ name: dict.overview.breakdownOther, cents: svcRest });
  const euros = (cents: number) =>
    (cents / 100).toLocaleString(loc, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

  // ── Donut des statuts ────────────────────────────────────────────────────
  const donut = [
    { label: s.status.completed, count: realized, color: "#CBFF03" },
    { label: s.status.confirmed, count: confirmedUpcoming, color: "#8FB300" },
    { label: s.status.pending, count: pending, color: "#FFB020" },
    { label: s.status.cancelled, count: cancelled, color: "#4a4a4a" },
  ];
  const C = 2 * Math.PI * 34;
  let acc = 0;
  const donutSegs = donut.map((d) => {
    const frac = total > 0 ? d.count / total : 0;
    const seg = { ...d, dash: frac * C, offset: acc * C };
    acc += frac;
    return seg;
  });

  return (
    <>
      <Topbar title={s.title} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Ligne 1 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label={s.revenue}
            value={(revenueMonth / 100).toLocaleString(loc, {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: revenueMonth % 100 === 0 ? 0 : 2,
            })}
            trend={trend(revenueMonth, revenueLastMonth)}
            hint={s.vsLastMonth}
          />
          <StatCard
            label={s.sessionsMonth}
            value={String(sessionsMonth)}
            trend={trend(sessionsMonth, sessionsLastMonth)}
            hint={s.vsLastMonth}
          />
          <StatCard
            label={s.newClients}
            value={String(newClientsMonth)}
            trend={trend(newClientsMonth, newClientsLastMonth)}
            hint={s.vsLastMonth}
          />
          <StatCard label={s.clients} value={String(clients.length)} />
        </div>

        {/* Ligne 2 */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-4">
          <StatCard label={s.upcoming} value={String(upcoming)} />
          <StatCard label={s.pending} value={String(pending)} />
          <StatCard label={s.confirmRate} value={`${confirmRate}%`} />
          <StatCard label={s.cancelRate} value={`${cancelRate}%`} />
        </div>

        {/* Héros : revenus 12 mois en aire */}
        <div className="mt-4 sm:mt-5">
          <AreaChartCard
            title={`${dict.overview.chartRevenue} · ${s.last12Months}`}
            headline={euros(revenueMonth)}
            trend={trend(revenueMonth, revenueLastMonth)}
            data={revenueByMonth}
            unit="currency"
            locale={loc}
            mode="months"
          />
        </div>

        {/* Séances par semaine + donut des statuts */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 lg:grid-cols-2">
          <ChartCard
            title={s.perWeek}
            data={sessionsByWeek}
            locale={loc}
            mode="weeks"
          />
          <section className="rounded-2xl border border-border bg-bg-card p-5">
            <h2 className="text-base font-semibold text-text-base">
              {s.byStatus}
            </h2>
            {total === 0 ? (
              <p className="mt-4 text-sm text-text-dim">{s.none}</p>
            ) : (
              <div className="mt-4 flex items-center gap-6">
                <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
                  <circle cx="48" cy="48" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
                  {donutSegs.map(
                    (d) =>
                      d.dash > 0 && (
                        <circle
                          key={d.label}
                          cx="48"
                          cy="48"
                          r="34"
                          fill="none"
                          stroke={d.color}
                          strokeWidth="11"
                          strokeDasharray={`${d.dash} ${C - d.dash}`}
                          strokeDashoffset={-d.offset}
                          transform="rotate(-90 48 48)"
                        />
                      )
                  )}
                  <text x="48" y="53" textAnchor="middle" fill="#F2F2F0" fontSize="17" fontWeight="800">
                    {total}
                  </text>
                </svg>
                <ul className="flex min-w-0 flex-1 flex-col gap-2">
                  {donut.map((d) => (
                    <li key={d.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="truncate text-text-muted">{d.label}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-text-base">
                        {d.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Jours de la semaine + revenus par prestation */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-bg-card p-5">
            <h2 className="text-base font-semibold text-text-base">
              {s.byWeekday}
            </h2>
            <div className="mt-5 flex h-32 items-end gap-2">
              {weekdayCounts.map((c, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-md ${
                        c > 0
                          ? "bg-gradient-to-t from-[#9DCC00] to-accent"
                          : "bg-white/[0.06]"
                      }`}
                      style={{
                        height: c > 0 ? `${Math.max(8, (c / weekdayMax) * 100)}%` : "4px",
                      }}
                      title={String(c)}
                    />
                  </div>
                  <span className="text-[10px] uppercase text-text-dim">
                    {weekdayLabels[i]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-bg-card p-5">
            <h2 className="text-base font-semibold text-text-base">
              {s.byService}
            </h2>
            {svcTotal === 0 ? (
              <p className="mt-4 text-sm text-text-dim">{s.none}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {svcRows.map((r) => {
                  const pct = Math.round((r.cents / svcTotal) * 100);
                  return (
                    <li key={r.name}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate text-text-muted">{r.name}</span>
                        <span className="shrink-0 font-semibold text-text-base">
                          {euros(r.cents)}{" "}
                          <span className="font-normal text-text-dim">
                            · {pct}%
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#9DCC00] to-accent"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
