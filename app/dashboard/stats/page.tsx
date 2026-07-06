import Topbar from "@/components/dashboard/Topbar";
import StatCard, { type Trend } from "@/components/dashboard/StatCard";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";

type Status = "pending" | "confirmed" | "completed" | "cancelled";
type Booking = { starts_at: string; ends_at: string; status: Status };
type ClientRow = { created_at: string };

export default async function StatsPage() {
  const { dict } = getServerDictionary();
  const s = dict.stats;
  const supabase = createClient();

  const now = new Date();
  const nowMs = now.getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // Historique borné à 1 an : suffisant pour toutes les stats affichées.
  const yearAgo = new Date(nowMs - 366 * 86400000).toISOString();

  const [clientsRes, bookingsRes, paymentsRes] = await Promise.all([
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

  // ── Séances par semaine (8 dernières) ───────────────────────────────────
  const dow = (now.getDay() + 6) % 7;
  const curWeekStart = new Date(now);
  curWeekStart.setHours(0, 0, 0, 0);
  curWeekStart.setDate(now.getDate() - dow);
  const firstWeek = new Date(curWeekStart);
  firstWeek.setDate(curWeekStart.getDate() - 7 * 7);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekCounts = Array(8).fill(0) as number[];
  for (const b of active) {
    const idx = Math.floor(
      (new Date(b.starts_at).getTime() - firstWeek.getTime()) / weekMs
    );
    if (idx >= 0 && idx < 8) weekCounts[idx] += 1;
  }
  const weekMax = Math.max(...weekCounts, 1);

  const statusRows: { key: Status; label: string; count: number }[] = [
    { key: "pending", label: s.status.pending, count: pending },
    { key: "confirmed", label: s.status.confirmed, count: confirmedUpcoming },
    { key: "completed", label: s.status.completed, count: realized },
    { key: "cancelled", label: s.status.cancelled, count: cancelled },
  ];

  return (
    <>
      <Topbar title={s.title} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Ligne 1 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label={s.revenue}
            value={(revenueMonth / 100).toLocaleString("fr-FR", {
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

        {/* Séances par semaine */}
        <section className="mt-6 rounded-2xl border border-border bg-bg-card p-5">
          <h2 className="text-base font-semibold text-text-base">
            {s.perWeek}
          </h2>
          <div className="mt-5 flex h-32 items-end gap-2">
            {weekCounts.map((c, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-accent/80"
                    style={{ height: `${(c / weekMax) * 100}%`, minHeight: c > 0 ? 4 : 0 }}
                    title={String(c)}
                  />
                </div>
                <span className="text-[10px] text-text-dim">
                  {i === 7 ? "·" : `S-${7 - i}`}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Répartition par statut */}
        <section className="mt-4 rounded-2xl border border-border bg-bg-card p-5">
          <h2 className="text-base font-semibold text-text-base">
            {s.byStatus}
          </h2>
          {total === 0 ? (
            <p className="mt-4 text-sm text-text-dim">{s.none}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {statusRows.map((row) => {
                const pct = total ? Math.round((row.count / total) * 100) : 0;
                return (
                  <li key={row.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-text-muted">{row.label}</span>
                      <span className="font-medium text-text-base">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
