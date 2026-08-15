import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import ClientDetail from "@/components/dashboard/clients/ClientDetail";
import ReportClientButton from "@/components/dashboard/clients/ReportClientButton";
import { TicketIcon, RepeatIcon, HistoryIcon, ChevronDownIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Client } from "@/lib/clients/types";

// Fiche d'un client. RLS garantit qu'on ne peut charger que ses propres
// clients : une fiche inexistante ou appartenant à un autre coach → 404.
export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { dict, locale } = getServerDictionary();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const supabase = createClient();

  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const client = data as Client;
  const title = [client.first_name, client.last_name].filter(Boolean).join(" ");

  // Abonnements mensuels de ce client (RLS : seuls ceux du coach).
  const { data: subRows } = await supabase
    .from("client_subscriptions")
    .select("id, status, current_period_end, services(name, price_cents)")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false });
  const subs = (subRows ?? []).map((s) => {
    const svc = Array.isArray(s.services) ? s.services[0] : s.services;
    return {
      id: s.id as string,
      status: s.status as string,
      name:
        ((svc as { name?: string } | null)?.name as string) ?? "Abonnement",
      price_cents:
        ((svc as { price_cents?: number } | null)?.price_cents as number) ?? 0,
    };
  });

  // Historique des séances passées de ce client (les 20 dernières).
  const { data: historyRows } = await supabase
    .from("bookings")
    .select("id, starts_at, status, location, services(name)")
    .eq("client_id", params.id)
    .eq("is_block", false)
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(20);
  const history = (historyRows ?? []).map((b) => {
    const svc = Array.isArray(b.services) ? b.services[0] : b.services;
    return {
      id: b.id as string,
      starts_at: b.starts_at as string,
      cancelled: (b.status as string) === "cancelled",
      name: ((svc as { name?: string } | null)?.name as string) ?? "-",
    };
  });

  // Packs de séances achetés par ce client (RLS : seuls ceux du coach).
  const { data: packRows } = await supabase
    .from("pack_credits")
    .select("id, total, used, services(name)")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false });
  const packs = (packRows ?? []).map((p) => {
    const svc = Array.isArray(p.services) ? p.services[0] : p.services;
    return {
      id: p.id as string,
      total: p.total as number,
      used: p.used as number,
      name: ((svc as { name?: string } | null)?.name as string) ?? "Pack",
    };
  });

  return (
    <>
      <Topbar title={title || dict.clients.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {subs.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-card px-4 py-3"
              >
                <p className="min-w-0 truncate text-sm font-medium text-text-base">
                  <RepeatIcon size={15} className="mr-1.5 inline-block align-[-2px] text-accent" />{s.name}
                  <span className="text-text-muted">
                    {" "}
                    ·{" "}
                    {(s.price_cents / 100).toLocaleString(loc, {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: s.price_cents % 100 === 0 ? 0 : 2,
                    })}
                    {dict.clientSubs.perMonth}
                  </span>
                </p>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${
                    s.status === "active"
                      ? "bg-accent/10 text-accent"
                      : s.status === "canceling"
                      ? "bg-warning/10 text-warning"
                      : "border border-border-strong text-text-dim"
                  }`}
                >
                  {s.status === "active"
                    ? dict.clientSubs.active
                    : s.status === "canceling"
                    ? dict.clientSubs.canceling
                    : dict.clientSubs.inactive}
                </span>
              </div>
            ))}
          </div>
        )}
        {packs.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {packs.map((p) => {
              const left = Math.max(0, p.total - p.used);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-card px-4 py-3"
                >
                  <p className="min-w-0 truncate text-sm font-medium text-text-base">
                    <TicketIcon size={15} className="mr-1.5 inline-block align-[-2px] text-accent" />{p.name}
                    <span className="text-text-muted">
                      {" "}
                      · {p.used}/{p.total}
                    </span>
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${
                      left > 0
                        ? "bg-accent/10 text-accent"
                        : "border border-border-strong text-text-dim"
                    }`}
                  >
                    {left > 0
                      ? `${left} ${left === 1 ? dict.packs.remainingOne : dict.packs.remainingMany}`
                      : dict.packs.empty}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <ClientDetail client={client} />

        {/* Historique des séances : replié par défaut (bouton), natif via
            <details> donc zéro JS. */}
        <details className="group mt-4 rounded-2xl border border-border bg-bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5 text-sm font-semibold text-text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                <HistoryIcon size={15} />
              </span>
              {dict.clients.detail.history}
              {history.length > 0 && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {history.length}
                </span>
              )}
            </span>
            <ChevronDownIcon
              size={16}
              className="shrink-0 text-text-dim transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-border p-5 pt-4">
            {history.length === 0 ? (
              <p className="text-center text-sm text-text-dim">
                {dict.clients.detail.historyEmpty}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated p-3"
                  >
                    <div className="flex w-16 shrink-0 flex-col">
                      {/* Fuseau explicite : le serveur tourne en UTC. */}
                      <span className="text-xs font-medium text-text-base">
                        {new Date(h.starts_at).toLocaleDateString(loc, {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                          timeZone: "Europe/Paris",
                        })}
                      </span>
                      <span className="text-[11px] text-text-dim">
                        {new Date(h.starts_at).toLocaleTimeString(loc, {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Paris",
                        })}
                      </span>
                    </div>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        h.cancelled
                          ? "text-text-dim line-through"
                          : "font-medium text-text-base"
                      }`}
                    >
                      {h.name}
                    </span>
                    {h.cancelled && (
                      <span className="shrink-0 rounded-full border border-border-strong px-2 py-0.5 text-[10px] font-medium text-text-muted">
                        {dict.clients.detail.historyCancelled}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>

        {/* Recours discret : signaler ce client à l'équipe Madger. */}
        <ReportClientButton clientId={params.id} />
      </main>
    </>
  );
}
