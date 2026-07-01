import type Stripe from "stripe";

// Fin de la période payée d'un abonnement, en ISO. Depuis l'API Stripe 2025,
// current_period_end n'est plus au niveau de l'abonnement mais porté par ses
// items — on lit le premier item.
export function subPeriodEnd(sub: Stripe.Subscription): string | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

// ID de l'abonnement rattaché à une facture. Depuis l'API 2025, invoice.subscription
// a disparu au profit de invoice.parent.subscription_details.subscription.
export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}
