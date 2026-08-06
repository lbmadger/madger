import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getCoach } from "@/lib/coach/getCoach";
import { invoiceNumber } from "@/lib/invoices/utils";
import { DownloadIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

// Factures du coach : une facture client par paiement encaissé. Les factures
// Madger (commission de service) vivent sur la page Abonnement. Export
// comptable CSV en un clic.
export default async function InvoicesPage() {
  const { dict, locale } = getServerDictionary();
  const inv = dict.invoices;
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const supabase = createClient();
  const { coach } = await getCoach();

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount_cents, currency, paid_at, refunded_cents, clients(first_name, last_name), services(name)"
    )
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(100);

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
              <li key={r.id}>
                {/* Toute la ligne ouvre la facture (téléchargement dedans) :
                    le petit bouton « Télécharger » laissait croire à un
                    téléchargement direct. */}
                <Link
                  href={`/dashboard/factures/${r.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/40"
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
                  <svg className="shrink-0 text-text-dim" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Les factures Madger (commission de service) sont sur la page
            Abonnement : ici, uniquement les factures émises aux clients. */}
        <p className="mt-6 text-xs text-text-dim">
          {inv.madgerMovedHint}{" "}
          <Link
            href="/dashboard/abonnement"
            className="font-medium text-accent hover:underline"
          >
            {inv.madgerMovedLink}
          </Link>
        </p>
      </main>
    </>
  );
}
