import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getCoach } from "@/lib/coach/getCoach";
import {
  invoiceNumber,
  madgerInvoiceNumber,
  commissionPeriod,
} from "@/lib/invoices/utils";
import { isPro } from "@/lib/subscription/plan";
import { DownloadIcon, FileTextIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

// Factures du coach : une facture client par paiement encaissé, plus la
// facture mensuelle de commission Madger. Export comptable CSV en un clic.
export default async function InvoicesPage() {
  const { dict, locale } = getServerDictionary();
  const inv = dict.invoices;
  const loc = locale === "fr" ? "fr-FR" : "en-US";
  const supabase = createClient();
  const { coach } = await getCoach();

  const [{ data: payments }, { data: commissions }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount_cents, currency, paid_at, refunded_cents, clients(first_name, last_name), services(name)"
      )
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(100),
    // Commissions Madger prélevées : regroupées par mois côté page.
    // Borné à 36 mois et 2000 lignes : au-delà, Supabase tronquerait en
    // silence (max-rows) et les totaux seraient faux.
    supabase
      .from("payments")
      .select("commission_cents, released_at, resolved_at, paid_at")
      .gt("commission_cents", 0)
      .gte(
        "paid_at",
        new Date(Date.now() - 36 * 31 * 86400000).toISOString()
      )
      .order("paid_at", { ascending: false })
      .limit(2000),
  ]);

  const rows = (payments ?? []).map((p) => {
    const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
    const service = Array.isArray(p.services) ? p.services[0] : p.services;
    return {
      id: p.id as string,
      number: invoiceNumber(p.id as string, p.paid_at as string),
      date: new Date(p.paid_at as string).toLocaleDateString(loc, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      client:
        [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
        "-",
      service: (service?.name as string) ?? "-",
      amount: ((p.amount_cents as number) / 100).toLocaleString(loc, {
        style: "currency",
        currency: ((p.currency as string) || "eur").toUpperCase(),
      }),
      refunded: ((p.refunded_cents as number) || 0) > 0,
    };
  });

  // Factures Madger : un mois = une facture (total des commissions du mois).
  const byPeriod = new Map<string, { total: number; count: number }>();
  for (const c of commissions ?? []) {
    const period = commissionPeriod(c as never);
    if (!period) continue;
    const cur = byPeriod.get(period) ?? { total: 0, count: 0 };
    cur.total += (c.commission_cents as number) || 0;
    cur.count += 1;
    byPeriod.set(period, cur);
  }
  const madgerRows = Array.from(byPeriod.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([period, v]) => ({
      period,
      number: coach ? madgerInvoiceNumber(coach.id, period) : period,
      label: new Date(`${period}-01T12:00:00Z`).toLocaleDateString(loc, {
        month: "long",
        year: "numeric",
      }),
      total: (v.total / 100).toLocaleString(loc, {
        style: "currency",
        currency: "EUR",
      }),
      count: v.count,
    }));

  const year = new Date().getFullYear();

  return (
    <>
      <Topbar title={inv.title} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted">{inv.subtitle}</p>
          <a
            href={`/api/exports/accounting?year=${year}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-xs font-medium text-text-base transition-colors hover:border-accent"
          >
            <DownloadIcon size={13} />
            {inv.exportCsv}
          </a>
        </div>

        {/* Mentions légales incomplètes : les factures ne sont pas conformes */}
        {coach && !coach.siret && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/[0.06] px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-base">
                {inv.missingSiretTitle}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {inv.missingSiretDesc}
              </p>
            </div>
            <Link
              href="/dashboard/reglages"
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
            >
              {inv.missingSiretCta}
            </Link>
          </div>
        )}

        {/* Factures clients */}
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
          {inv.clientSection}
        </h2>
        {rows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-border bg-bg-card p-10 text-center">
            <p className="text-sm text-text-muted">{inv.empty}</p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text-base">
                      {r.number}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        r.refunded
                          ? "bg-danger/10 text-danger"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {r.refunded ? inv.statusRefunded : inv.statusPaid}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {r.date} · {r.client} · {r.service}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-text-base">
                  {r.amount}
                </span>
                <Link
                  href={`/dashboard/factures/${r.id}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-base transition-colors hover:border-accent"
                >
                  <DownloadIcon size={12} />
                  {inv.download}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Factures Madger (commission de service, une par mois) */}
        <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-dim">
          {inv.madgerSection}
        </h2>
        <p className="mt-1 text-xs text-text-dim">{inv.madgerSubtitle}</p>

        {/* Le coût réel du plan Gratuit, en euros, avec la sortie juste à
            côté : c'est ici que le coach voit ce que Pro lui économiserait. */}
        {coach &&
          !isPro(coach.pro_until) &&
          (() => {
            const yearTotal = Array.from(byPeriod.entries())
              .filter(([p]) => p.startsWith(String(year)))
              .reduce((s, [, v]) => s + v.total, 0);
            if (yearTotal <= 0) return null;
            return (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-4 py-3.5">
                <p className="text-sm text-text-base">
                  {inv.commissionYearTotal} {year} :{" "}
                  <strong>
                    {(yearTotal / 100).toLocaleString(loc, {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </strong>{" "}
                  <span className="text-text-muted">
                    · {inv.commissionYearPro}
                  </span>
                </p>
                <Link
                  href="/dashboard/abonnement"
                  className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                >
                  {inv.commissionYearCta}
                </Link>
              </div>
            );
          })()}
        {madgerRows.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-border bg-bg-card p-8 text-center">
            <p className="text-sm text-text-muted">{inv.madgerEmpty}</p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {madgerRows.map((r) => (
              <li
                key={r.period}
                className="flex items-center gap-3 rounded-2xl border border-border bg-bg-card p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <FileTextIcon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold capitalize text-text-base">
                    {r.label}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {r.number} · {r.count} {inv.sessionsCount}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-text-base">
                  {r.total}
                </span>
                <Link
                  href={`/dashboard/factures/madger/${r.period}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-text-base transition-colors hover:border-accent"
                >
                  <DownloadIcon size={12} />
                  {inv.download}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
