import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import StatCard from "@/components/dashboard/StatCard";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Booking } from "@/lib/bookings/types";

// Vue d'ensemble — premier écran après connexion. Les chiffres "clients" et
// "séances de la semaine" sont réels ; revenus et paiements en attente
// restent à 0 tant que le module Paiements (Phase 4) n'est pas branché.
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

  const [clientsRes, weekRes, upcomingRes, availRes, servicesRes] =
    await Promise.all([
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
    ]);

  const clientsCount = clientsRes.count ?? 0;
  const weekCount = weekRes.count ?? 0;
  const upcoming = (upcomingRes.data ?? []) as Booking[];
  const availabilityDone = (availRes.count ?? 0) > 0;
  const servicesDone = (servicesRes.count ?? 0) > 0;
  const showChecklist = !availabilityDone || !servicesDone;

  const stats = [
    { label: o.revenueMonth, value: "0 €" },
    { label: o.sessionsWeek, value: String(weekCount) },
    { label: o.activeClients, value: String(clientsCount) },
    { label: o.pendingPayments, value: "0 €" },
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
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
