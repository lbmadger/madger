import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoach } from "@/lib/coach/getCoach";
import { getServerDictionary } from "@/lib/i18n/server";
import {
  madgerInvoiceNumber,
  commissionPeriod,
} from "@/lib/invoices/utils";
import { MADGER_LEGAL } from "@/lib/invoices/madger";
import PrintButton from "@/components/invoices/PrintButton";

export const dynamic = "force-dynamic";

// Facture de commission Madger → coach pour un mois donné (AAAA-MM) : le
// récapitulatif des 5 % prélevés sur chaque séance encaissée du mois.
// Imprimable (→ « Enregistrer en PDF »), même gabarit que la facture client.
export default async function MadgerInvoicePage({
  params,
}: {
  params: { period: string };
}) {
  const { dict, locale } = getServerDictionary();
  const inv = dict.invoices;
  const loc = locale === "fr" ? "fr-FR" : "en-US";

  // Période attendue : AAAA-MM strict.
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(params.period)) notFound();

  const supabase = createClient();
  const { coach } = await getCoach();
  if (!coach) notFound();

  // Fenêtre large autour du mois demandé (une séance se paie rarement plus
  // de 6 mois avant son versement) : évite de rapatrier tout l'historique.
  const [py0, pm0] = params.period.split("-").map(Number);
  const windowStart = new Date(Date.UTC(py0, pm0 - 1 - 8, 1)).toISOString();
  const windowEnd = new Date(Date.UTC(py0, pm0 + 1, 1)).toISOString();
  const { data: commissions } = await supabase
    .from("payments")
    .select(
      "id, amount_cents, refunded_cents, commission_cents, released_at, resolved_at, paid_at, clients(first_name, last_name)"
    )
    .gt("commission_cents", 0)
    .gte("paid_at", windowStart)
    .lt("paid_at", windowEnd)
    .limit(2000);

  // Même règle de rattachement que la liste : mois du versement au coach.
  const lines = (commissions ?? [])
    .filter((c) => commissionPeriod(c as never) === params.period)
    .sort((a, b) =>
      ((a.released_at ?? a.paid_at) as string) <
      ((b.released_at ?? b.paid_at) as string)
        ? -1
        : 1
    );
  if (lines.length === 0) notFound();

  const total = lines.reduce(
    (s, c) => s + ((c.commission_cents as number) || 0),
    0
  );
  const number = madgerInvoiceNumber(coach.id, params.period);
  const money = (cents: number) =>
    (cents / 100).toLocaleString(loc, { style: "currency", currency: "EUR" });
  const dateStr = (iso: string) =>
    new Date(iso).toLocaleDateString(loc, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const periodLabel = new Date(
    `${params.period}-01T12:00:00Z`
  ).toLocaleDateString(loc, { month: "long", year: "numeric" });
  // Date d'émission : dernier jour du mois facturé.
  const [py, pm] = params.period.split("-").map(Number);
  const issuedAt = new Date(Date.UTC(py, pm, 0, 12)).toISOString();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href="/dashboard/factures"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-base"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {inv.back}
        </Link>
        <PrintButton label={inv.pdf} />
      </div>

      <div className="invoice-print rounded-2xl border border-border bg-bg-card p-6 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xl font-extrabold tracking-tight text-text-base">
              {inv.title.slice(0, -1)}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">{number}</p>
            <p className="mt-0.5 text-xs text-text-dim">
              {inv.issuedOn} {dateStr(issuedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold tracking-tight text-accent">
              {MADGER_LEGAL.brand}
            </p>
            <p className="text-xs text-text-dim">{MADGER_LEGAL.site}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {inv.issuer}
            </p>
            <p className="mt-1 font-semibold text-text-base">
              {MADGER_LEGAL.name}, {MADGER_LEGAL.brand}
            </p>
            <p className="text-text-muted">{MADGER_LEGAL.address}</p>
            <p className="text-text-muted">
              {inv.siretLabel} {MADGER_LEGAL.siret}
            </p>
            <p className="text-text-muted">{MADGER_LEGAL.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {inv.billedTo}
            </p>
            <p className="mt-1 font-semibold text-text-base">
              {coach.business_name ||
                [coach.first_name, coach.last_name].filter(Boolean).join(" ")}
            </p>
            {coach.business_name && (
              <p className="text-text-muted">
                {[coach.first_name, coach.last_name].filter(Boolean).join(" ")}
              </p>
            )}
            {coach.billing_address && (
              <p className="text-text-muted">{coach.billing_address}</p>
            )}
            {coach.city && <p className="text-text-muted">{coach.city}</p>}
            {coach.siret && (
              <p className="text-text-muted">
                {inv.siretLabel} {coach.siret}
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm text-text-muted">
          {inv.commissionService} · {inv.period}{" "}
          <span className="capitalize">{periodLabel}</span>
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
              <th className="py-2">{inv.date}</th>
              <th className="py-2 text-right">{inv.sessionAmount}</th>
              <th className="py-2 text-right">{inv.commissionCol}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((c) => {
              const kept =
                ((c.amount_cents as number) || 0) -
                ((c.refunded_cents as number) || 0);
              return (
                <tr key={c.id as string} className="border-b border-border">
                  <td className="py-2.5 text-text-muted">
                    {dateStr((c.released_at ?? c.paid_at) as string)}
                  </td>
                  <td className="py-2.5 text-right text-text-muted">
                    {money(kept)}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-text-base">
                    {money((c.commission_cents as number) || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-56">
            <div className="flex items-center justify-between border-b border-border py-2 text-sm">
              <span className="text-text-muted">Total</span>
              <span className="text-lg font-extrabold text-text-base">
                {money(total)}
              </span>
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-accent">
              {inv.statusSettled}
            </p>
          </div>
        </div>

        {MADGER_LEGAL.vatExempt && (
          <p className="mt-6 text-xs text-text-muted">{inv.vatExempt}</p>
        )}

        <p className="mt-10 border-t border-border pt-4 text-[11px] leading-relaxed text-text-dim">
          {inv.madgerFooter}
        </p>
      </div>
    </main>
  );
}
