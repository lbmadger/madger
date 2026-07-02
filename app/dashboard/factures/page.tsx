import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { invoiceNumber } from "@/lib/invoices/utils";

export const dynamic = "force-dynamic";

// Factures du coach : une par paiement encaissé (numéro dérivé du paiement),
// téléchargeables en PDF via la page imprimable.
export default async function InvoicesPage() {
  const { dict, locale } = getServerDictionary();
  const inv = dict.invoices;
  const loc = locale === "fr" ? "fr-FR" : "en-US";
  const supabase = createClient();

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

  return (
    <>
      <Topbar title={inv.title} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <p className="mb-5 text-sm text-text-muted">{inv.subtitle}</p>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
            <p className="text-sm text-text-muted">{inv.empty}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
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
                          ? "bg-red-500/10 text-red-400"
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
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
