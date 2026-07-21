import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoach } from "@/lib/coach/getCoach";
import { getServerDictionary } from "@/lib/i18n/server";
import { invoiceNumber } from "@/lib/invoices/utils";
import PrintButton from "@/components/invoices/PrintButton";
import MadgerLogo from "@/components/ui/MadgerLogo";

export const dynamic = "force-dynamic";

// Facture imprimable (→ « Enregistrer en PDF » du navigateur). Seule la zone
// .invoice-print s'imprime, en noir sur blanc (cf. globals.css @media print).
export default async function InvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const { dict, locale } = getServerDictionary();
  const inv = dict.invoices;
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const supabase = createClient();
  const { coach } = await getCoach();

  const { data: p } = await supabase
    .from("payments")
    .select(
      "id, amount_cents, currency, paid_at, refunded_cents, stripe_payment_intent_id, clients(first_name, last_name, email), services(name), bookings(starts_at)"
    )
    .eq("id", params.id)
    .not("paid_at", "is", null)
    .maybeSingle();

  if (!p || !coach) notFound();

  const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
  const service = Array.isArray(p.services) ? p.services[0] : p.services;
  const booking = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
  const number = invoiceNumber(p.id as string, p.paid_at as string);
  const refunded = ((p.refunded_cents as number) || 0) > 0;
  const money = (cents: number) =>
    (cents / 100).toLocaleString(loc, {
      style: "currency",
      currency: ((p.currency as string) || "eur").toUpperCase(),
    });
  const dateStr = (iso: string) =>
    new Date(iso).toLocaleDateString(loc, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      {/* Actions (masquées à l'impression) */}
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

      {/* Facture */}
      <div className="invoice-print rounded-2xl border border-border bg-bg-card p-6 sm:p-10">
        {/* Liseré accent : en SVG (fill d'attribut), il survit à l'impression
            noir sur blanc contrairement à un fond CSS. */}
        <svg aria-hidden width="100%" height="4" className="mb-8 block">
          <rect width="100%" height="4" rx="2" fill="#CBFF03" />
        </svg>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-extrabold tracking-tight text-text-base">
              {inv.title.slice(0, -1)}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-muted">{number}</p>
            <p className="mt-0.5 text-xs text-text-dim">
              {inv.issuedOn} {dateStr(p.paid_at as string)}
            </p>
          </div>
          {/* Marque : icône de l'app (imprime bien, fills SVG) + nom */}
          <div className="flex flex-col items-end gap-2 text-right">
            <MadgerLogo size={38} />
            <div>
              <p className="text-base font-extrabold tracking-tight text-accent">
                MADGER
              </p>
              <p className="text-xs text-text-dim">madger.app</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {inv.issuer}
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
            {coach.vat_number && (
              <p className="text-text-muted">
                {inv.vatLabel} {coach.vat_number}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {inv.billedTo}
            </p>
            <p className="mt-1 font-semibold text-text-base">
              {[client?.first_name, client?.last_name].filter(Boolean).join(" ") || "-"}
            </p>
            {client?.email && <p className="text-text-muted">{client.email}</p>}
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
              <th className="py-2">{inv.service}</th>
              <th className="py-2">{inv.date}</th>
              <th className="py-2 text-right">{inv.amount}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-3 font-medium text-text-base">
                {(service?.name as string) ?? inv.defaultService}
              </td>
              <td className="py-3 text-text-muted">
                {booking?.starts_at
                  ? dateStr(booking.starts_at as string)
                  : dateStr(p.paid_at as string)}
              </td>
              <td className="py-3 text-right font-semibold text-text-base">
                {money(p.amount_cents as number)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-56">
            <div className="flex items-center justify-between border-b border-border py-2 text-sm">
              <span className="text-text-muted">Total</span>
              <span className="text-lg font-extrabold text-text-base">
                {money(p.amount_cents as number)}
              </span>
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-accent">
              {refunded
                ? `${inv.statusRefunded} · ${money(p.refunded_cents as number)}`
                : `✓ ${inv.statusPaid} le ${dateStr(p.paid_at as string)}`}
            </p>
          </div>
        </div>

        {!coach.vat_number && (
          <p className="mt-6 text-xs text-text-muted">{inv.vatExempt}</p>
        )}

        <p className="mt-10 border-t border-border pt-4 text-[11px] leading-relaxed text-text-dim">
          {inv.paymentRef}{" "}
          {(p.stripe_payment_intent_id as string | null) ?? p.id}. {inv.legal}
        </p>
      </div>
    </main>
  );
}
