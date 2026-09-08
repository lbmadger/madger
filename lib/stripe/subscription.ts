import type Stripe from "stripe";
import { currentMonthlyCents } from "@/lib/subscription/offer";

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

// PaymentIntent qui a réglé une facture. invoice.payment_intent et
// invoice.charge n'existent plus depuis l'API 2025 : la facture porte une
// liste `payments` (à demander avec expand: ["payments"]), dont chaque
// entrée référence un PaymentIntent.
export function invoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  const list = invoice.payments?.data ?? [];
  for (const ip of list) {
    const pi = ip.payment?.payment_intent;
    if (pi) return typeof pi === "string" ? pi : pi.id;
  }
  return null;
}

// Statut local d'un abonnement (coach Pro ou abonnement client), à partir du
// statut Stripe. Les colonnes subscription_status / client_subscriptions.status
// n'admettent que : active, trialing, canceling, past_due, canceled.
//   canceling  : encore actif (ou en essai) mais arrêt programmé en fin de
//                période, réactivable d'un clic.
//   past_due   : prélèvement en échec (Stripe : past_due ou unpaid), le
//                service continue jusqu'à la fin de la période déjà payée.
//   canceled   : terminé, ou jamais démarré (incomplete, incomplete_expired).
//   paused     : traité comme canceling (Stripe met en pause après un essai
//                sans moyen de paiement ; personne ne facture).
export type LocalSubStatus = "active" | "trialing" | "canceling" | "past_due" | "canceled";

export function localSubStatus(sub: Stripe.Subscription): LocalSubStatus {
  const s = sub.status;
  if ((s === "active" || s === "trialing") && sub.cancel_at_period_end) return "canceling";
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "paused") return "canceling";
  return "canceled";
}

// Valeur d'UN MOIS de l'abonnement, en centimes, pour les gestes « 1 mois
// offert » (parrainage, rétention) : ce que le coach paie réellement (prix de
// lancement ou tarif normal, mensuel ou annuel ramené au mois), jamais un
// montant en dur. Repli : le tarif mensuel en vigueur.
export function monthlyCreditCents(sub: Stripe.Subscription | null | undefined): number {
  const price = sub?.items?.data?.[0]?.price;
  const unit = price?.unit_amount;
  if (!price || typeof unit !== "number" || unit <= 0) return currentMonthlyCents();
  const interval = price.recurring?.interval;
  const count = price.recurring?.interval_count ?? 1;
  if (interval === "year") return Math.round(unit / (12 * count));
  if (interval === "month") return Math.round(unit / count);
  return currentMonthlyCents();
}
