import type { SupabaseClient } from "@supabase/supabase-js";
import { renderInvoicePdf, type InvoicePdfInput } from "@/lib/invoices/pdf";
import { sendEmail } from "@/lib/email/resend";
import { invoiceClient, creditNoteClient } from "@/lib/email/templates";
import { notifyClient } from "@/lib/notifications/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://madger.app";

type InvoiceRowFull = {
  id: string;
  coach_id: string;
  payment_id: string | null;
  number: string | null;
  kind: string;
  issued_at: string | null;
  amount_cents: number;
  currency: string;
  client_name: string | null;
  client_email: string | null;
  service_name: string | null;
  booking_starts_at: string | null;
  reason: string | null;
  credits_invoice_id: string | null;
  emailed_at: string | null;
};

// Charge tout ce qu'il faut pour rendre la pièce (facture ou avoir).
export async function loadInvoicePdfInput(
  admin: SupabaseClient,
  invoiceId: string
): Promise<{ row: InvoiceRowFull; input: InvoicePdfInput } | null> {
  const { data: row } = await admin
    .from("invoices")
    .select(
      "id, coach_id, payment_id, number, kind, issued_at, amount_cents, currency, client_name, client_email, service_name, booking_starts_at, reason, credits_invoice_id, emailed_at"
    )
    .eq("id", invoiceId)
    .maybeSingle();
  if (!row || !row.number) return null;
  const r = row as InvoiceRowFull;

  const [{ data: coach }, { data: pay }, linked] = await Promise.all([
    admin
      .from("coaches")
      .select("first_name, last_name, business_name, billing_address, city, siret, vat_number")
      .eq("id", r.coach_id)
      .maybeSingle(),
    r.payment_id
      ? admin
          .from("payments")
          .select("stripe_payment_intent_id")
          .eq("id", r.payment_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    r.credits_invoice_id
      ? admin
          .from("invoices")
          .select("number")
          .eq("id", r.credits_invoice_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const input: InvoicePdfInput = {
    kind: r.kind === "credit_note" ? "credit_note" : "invoice",
    number: r.number as string,
    issuedAt: new Date(r.issued_at ?? Date.now()),
    amountCents: r.amount_cents,
    currency: r.currency || "eur",
    clientName: r.client_name || "-",
    clientEmail: r.client_email,
    serviceName: r.service_name || "Séance de coaching",
    bookingStartsAt: r.booking_starts_at ? new Date(r.booking_starts_at) : null,
    linkedNumber: (linked?.data as { number?: string } | null)?.number ?? null,
    reason: r.reason,
    paymentRef: (pay?.stripe_payment_intent_id as string | null) ?? r.payment_id,
    coach: {
      name:
        [coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
        "Coach",
      businessName: (coach?.business_name as string | null) ?? null,
      address: (coach?.billing_address as string | null) ?? null,
      city: (coach?.city as string | null) ?? null,
      siret: (coach?.siret as string | null) ?? null,
      vatNumber: (coach?.vat_number as string | null) ?? null,
    },
  };
  return { row: r, input };
}

// Envoie la pièce au client par email (PDF joint), UNE seule fois : la ligne
// est réclamée (emailed_at) avant l'envoi. Best-effort : ne lève jamais.
export async function emailInvoice(
  admin: SupabaseClient,
  invoiceId: string | null | undefined
): Promise<boolean> {
  if (!invoiceId) return false;
  let claimedHere = false;
  try {
    const loaded = await loadInvoicePdfInput(admin, invoiceId);
    if (!loaded || !loaded.row.client_email) return false;
    const { row, input } = loaded;

    const { data: claimed } = await admin
      .from("invoices")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", invoiceId)
      .is("emailed_at", null)
      .select("id");
    if (!claimed?.length) return false;
    claimedHere = true;

    const bytes = await renderInvoicePdf(input);
    const base64 = Buffer.from(bytes).toString("base64");
    const amountStr = (row.amount_cents / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: (row.currency || "eur").toUpperCase(),
    });
    const isCredit = input.kind === "credit_note";
    const tpl = isCredit
      ? creditNoteClient({
          coachName: input.coach.businessName || input.coach.name,
          number: input.number,
          linkedNumber: input.linkedNumber ?? undefined,
          amountStr,
          reason: input.reason ?? undefined,
          spaceUrl: `${APP_URL}/espace`,
        })
      : invoiceClient({
          coachName: input.coach.businessName || input.coach.name,
          number: input.number,
          amountStr,
          serviceName: input.serviceName,
          spaceUrl: `${APP_URL}/espace`,
        });
    const ok = await sendEmail({
      to: row.client_email as string,
      subject: tpl.subject,
      html: tpl.html,
      attachments: [
        { filename: `${input.number}.pdf`, content: base64 },
      ],
    });
    if (!ok) {
      // Envoi raté : la pièce redevient envoyable (retry au prochain appel).
      await admin
        .from("invoices")
        .update({ emailed_at: null })
        .eq("id", invoiceId);
      return false;
    }
    await notifyClient(admin, {
      email: row.client_email as string,
      type: isCredit ? "credit_note" : "invoice",
      coachName: input.coach.name,
      startsAt: null,
      bookingId: null,
    });
    return true;
  } catch (e) {
    console.error("[emailInvoice]", e instanceof Error ? e.message : e);
    // Rendu PDF ou envoi planté APRÈS la réclamation : la pièce redevient
    // envoyable, sinon le client ne la recevrait jamais.
    if (claimedHere) {
      await admin
        .from("invoices")
        .update({ emailed_at: null })
        .eq("id", invoiceId);
    }
    return false;
  }
}
