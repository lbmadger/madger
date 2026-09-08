import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { splitVat, vatApplies } from "@/lib/invoices/vat";
import {
  displayInvoiceNumber,
  creditNotesOf,
  type InvoiceRow,
} from "@/lib/invoices/utils";

export const dynamic = "force-dynamic";

// Export comptable CSV du coach connecté : une ligne par paiement encaissé de
// l'année demandée (?year=2026), avec numéro de facture, montants, frais de
// transaction et net versé. Les frais Stripe réels ne figurent pas : ils sont
// supportés par Madger (comptabilité interne). Format tableur français : séparateur « ; », virgule décimale,
// BOM UTF-8 pour Excel. La RLS limite naturellement aux paiements du coach.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = Number(yearParam) || new Date().getFullYear();
  const from = new Date(Date.UTC(year, 0, 1)).toISOString();
  const to = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

  // TVA du coach (migration 0068) : colonnes HT / TVA ventilées si assujetti,
  // sinon HT = TTC et TVA = 0 (franchise en base).
  const { data: me } = await supabase
    .from("coaches")
    .select("vat_number, vat_rate_bps")
    .eq("id", user.id)
    .maybeSingle();
  const vatBps = vatApplies(me?.vat_number as string | null, me?.vat_rate_bps as number | null)
    ? (me?.vat_rate_bps as number)
    : 0;

  const { data: payments, error } = await supabase
    .from("payments")
    .select(
      "id, amount_cents, refunded_cents, commission_cents, provider_fee_cents, payout_cents, escrow_status, paid_at, released_at, clients(first_name, last_name), services(name), invoices(number, kind, amount_cents, issued_at)"
    )
    .not("paid_at", "is", null)
    .gte("paid_at", from)
    .lt("paid_at", to)
    .order("paid_at", { ascending: true })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }

  const money = (cents: number | null | undefined) =>
    (((cents as number) || 0) / 100).toFixed(2).replace(".", ",");
  // Champ CSV protégé : guillemets doublés, encadré si séparateur présent.
  const cell = (v: string) =>
    /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

  const header = [
    "Date paiement",
    "Facture",
    "Avoirs",
    "Client",
    "Prestation",
    "Montant TTC (EUR)",
    "Montant HT (EUR)",
    "TVA (EUR)",
    "Rembourse (EUR)",
    // Frais de transaction Madger (tout compris). En paiement en 3 fois, les
    // frais du prestataire, à la charge du coach, s'y ajoutent.
    "Frais de transaction (EUR)",
    "Net verse (EUR)",
    "Statut",
    "Date versement",
  ];

  const rows = (payments ?? []).map((p) => {
    const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
    const service = Array.isArray(p.services) ? p.services[0] : p.services;
    return [
      new Date(p.paid_at as string).toLocaleDateString("fr-FR", {
        timeZone: "Europe/Paris",
      }),
      displayInvoiceNumber(
        p.invoices as InvoiceRow[] | null,
        p.id as string,
        p.paid_at as string
      ),
      // Avoirs rattachés (numéro et montant), séparés par un espace.
      cell(
        creditNotesOf(p.invoices as InvoiceRow[] | null)
          .map((cn) => `${cn.number} (${money(cn.amount_cents)})`)
          .join(" ") || "-"
      ),
      cell(
        [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
          "-"
      ),
      cell((service?.name as string) ?? "-"),
      money(p.amount_cents as number),
      money(splitVat((p.amount_cents as number) || 0, vatBps).htCents),
      money(splitVat((p.amount_cents as number) || 0, vatBps).vatCents),
      money(p.refunded_cents as number),
      money(
        ((p.commission_cents as number) || 0) +
          ((p.provider_fee_cents as number) || 0)
      ),
      money(p.payout_cents as number),
      (p.escrow_status as string) || "-",
      p.released_at
        ? new Date(p.released_at as string).toLocaleDateString("fr-FR", {
            timeZone: "Europe/Paris",
          })
        : "-",
    ].join(";");
  });

  const csv = "\uFEFF" + [header.join(";"), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="madger-compta-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
