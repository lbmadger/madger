import Topbar from "@/components/dashboard/Topbar";
import StatCard from "@/components/dashboard/StatCard";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";

type Status = "pending" | "confirmed" | "completed" | "cancelled";
type Row = { starts_at: string; ends_at: string; status: Status };

// Statistiques de base à partir des données réelles (hors revenus, qui
// arriveront avec le module Paiements / Stripe).
export default async function StatsPage() {
  const { dict } = getServerDictionary();
  const s = dict.stats;
  const supabase = createClient();

  const [clientsRes, bookingsRes] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("starts_at, ends_at, status"),
  ]);

  const clientsCount = clientsRes.count ?? 0;
  const bookings = (bookingsRes.data ?? []) as Row[];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const active = bookings.filter((b) => b.status !== "cancelled");
  const sessionsMonth = active.filter((b) => {
    const d = new Date(b.starts_at);
    return d >= monthStart && d < monthEnd;
  }).length;
  const upcoming = active.filter(
    (b) => new Date(b.ends_at).getTime() >= now.getTime()
  ).length;
  const pending = bookings.filter((b) => b.status === "pending").length;

  const statuses: Status[] = ["pending", "confirmed", "completed", "cancelled"];
  const counts: Record<Status, number> = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const b of bookings) counts[b.status] = (counts[b.status] ?? 0) + 1;
  const total = bookings.length;

  const cards = [
    { label: s.clients, value: String(clientsCount) },
    { label: s.sessionsMonth, value: String(sessionsMonth) },
    { label: s.upcoming, value: String(upcoming) },
    { label: s.pending, value: String(pending) },
  ];

  return (
    <>
      <Topbar title={s.title} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((c) => (
            <StatCard key={c.label} label={c.label} value={c.value} />
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-bg-card p-5">
          <h2 className="text-base font-semibold text-text-base">
            {s.byStatus}
          </h2>
          {total === 0 ? (
            <p className="mt-4 text-sm text-text-dim">{s.none}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {statuses.map((st) => {
                const pct = total ? Math.round((counts[st] / total) * 100) : 0;
                return (
                  <li key={st}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-text-muted">{s.status[st]}</span>
                      <span className="font-medium text-text-base">
                        {counts[st]}
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
