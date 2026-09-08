import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { planOf, feeRatePercent } from "@/lib/subscription/plan";
import { TERMS_VERSION } from "@/lib/legal/terms";
import { installmentsEligible } from "@/lib/stripe/installments";

export const dynamic = "force-dynamic";

// Crée une session de paiement Stripe pour réserver une prestation payante.
// - Séance/pack : SÉQUESTRE. La charge est faite sur le compte PLATEFORME →
//   l'argent est retenu par Madger, puis transféré au coach après la séance
//   (24 h) si rien n'est signalé.
// - Abonnement mensuel : souscription récurrente versée directement au coach
//   (transfer_data), frais de transaction Madger en application_fee (taux du
//   plan : 5 % Essentiel, 3 % Pro). Sur une destination charge, Stripe
//   prélève ses frais sur la plateforme : « tout compris » de fait. Pas de
//   séquestre sur du récurrent.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const body = await req.json();
  const {
    coach_slug,
    service_id,
    first_name,
    last_name,
    email,
    phone,
    starts_at,
    duration_min,
    online,
    message,
    group_session_id,
  } = body;

  if (!coach_slug || !first_name || !email || (!service_id && !group_session_id)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: coach } = await supabase
    .from("coaches")
    .select(
      "id, siret, stripe_account_id, stripe_charges_enabled, pro_until, pro_bonus_until, booking_mode, min_notice_hours, installments_enabled"
    )
    .eq("slug", coach_slug)
    .eq("listed", true)
    .maybeSingle();
  if (!coach || !coach.stripe_charges_enabled || !coach.stripe_account_id) {
    return NextResponse.json({ error: "coach_cannot_charge" }, { status: 400 });
  }
  // Point de non-retour : tout encaissement génère une facture, et une
  // facture sans SIRET n'est pas conforme (mentions obligatoires du vendeur).
  // On refuse ici plutôt que d'émettre le document irrégulier. Le dashboard
  // du coach prévient bien avant : checklist, conseils de Leia, bandeaux
  // Prestations et Factures.
  if (!String(coach.siret ?? "").trim()) {
    return NextResponse.json(
      { error: "coach_billing_incomplete" },
      { status: 400 }
    );
  }

  // ── Place dans un cours collectif (migration 0068) ────────────────────────
  // Le cours porte son prix (par personne), son horaire et ses places. La
  // place est débitée tout de suite (jamais d'empreinte : le coach a déjà
  // choisi de donner ce cours) et retenue sous séquestre comme une séance.
  if (group_session_id) {
    const { data: gs } = await supabase
      .from("group_sessions")
      .select(
        "id, service_id, name, starts_at, ends_at, capacity, price_cents, currency, status, location"
      )
      .eq("id", String(group_session_id))
      .eq("coach_id", coach.id)
      .maybeSingle();
    if (!gs || gs.status !== "scheduled" || (gs.price_cents as number) <= 0) {
      return NextResponse.json({ error: "session_unavailable" }, { status: 400 });
    }
    const gsStart = new Date(gs.starts_at as string);
    const gsNoticeMs = ((coach.min_notice_hours as number) || 2) * 3600000;
    if (gsStart.getTime() < Date.now() + gsNoticeMs) {
      return NextResponse.json({ error: "too_soon" }, { status: 400 });
    }
    // Places : réservations vivantes + paiements en cours (verrous 15 min).
    const holdCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await supabase.from("slot_holds").delete().lt("created_at", holdCutoff);
    const [{ count: taken }, { count: holding }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("group_session_id", gs.id)
        .in("status", ["pending", "confirmed"]),
      supabase
        .from("slot_holds")
        .select("id", { count: "exact", head: true })
        .eq("group_session_id", gs.id)
        .gte("created_at", holdCutoff),
    ]);
    if ((taken ?? 0) + (holding ?? 0) >= (gs.capacity as number)) {
      return NextResponse.json({ error: "session_full" }, { status: 409 });
    }
    let gsHoldId: string | null = null;
    {
      const { data: hold } = await supabase
        .from("slot_holds")
        .insert({
          coach_id: coach.id,
          starts_at: gs.starts_at,
          ends_at: gs.ends_at,
          group_session_id: gs.id,
        })
        .select("id")
        .single();
      gsHoldId = (hold?.id as string) ?? null;
    }
    const gsDuration = Math.max(
      15,
      Math.round(
        (new Date(gs.ends_at as string).getTime() - gsStart.getTime()) / 60000
      )
    );
    let gsSession;
    try {
      gsSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: (gs.currency as string) || "eur",
              product_data: { name: gs.name as string },
              unit_amount: gs.price_cents as number,
            },
            quantity: 1,
          },
        ],
        customer_email: String(email),
        payment_method_types: ["card", "link"],
        payment_intent_data: { transfer_group: `coach_${coach.id}` },
        ui_mode: "embedded_page",
        return_url: `${origin}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          coach_id: coach.id,
          coach_slug: String(coach_slug),
          service_id: (gs.service_id as string | null) ?? "",
          group_session_id: gs.id as string,
          first_name: String(first_name).slice(0, 80),
          last_name: last_name ? String(last_name).slice(0, 80) : "",
          email: String(email).slice(0, 254),
          phone: phone ? String(phone).slice(0, 30) : "",
          starts_at: gs.starts_at as string,
          duration_min: String(gsDuration),
          online: gs.location === "online" ? "1" : "0",
          message: message ? String(message).slice(0, 500) : "",
          terms_version: TERMS_VERSION,
          installments: "0",
        },
      });
    } catch (err) {
      if (gsHoldId) await supabase.from("slot_holds").delete().eq("id", gsHoldId);
      throw err;
    }
    if (gsHoldId) {
      await supabase
        .from("slot_holds")
        .update({ stripe_session_id: gsSession.id })
        .eq("id", gsHoldId);
    }
    return NextResponse.json({ client_secret: gsSession.client_secret });
  }

  const { data: service } = await supabase
    .from("services")
    .select("name, price_cents, currency, type, duration_min, capacity")
    .eq("id", service_id)
    .eq("coach_id", coach.id)
    .eq("active", true)
    .maybeSingle();
  if (!service || service.price_cents <= 0) {
    return NextResponse.json({ error: "invalid_service" }, { status: 400 });
  }
  // Une prestation collective se réserve sur un cours planifié, jamais sur
  // un créneau libre.
  if ((service.capacity as number | null ?? 1) > 1) {
    return NextResponse.json({ error: "group_requires_session" }, { status: 400 });
  }
  // Les packs sont réservés au plan Pro : un coach repassé Essentiel ne peut
  // plus en vendre (la vue publique les masque déjà, ceci est la sécurité).
  if (service.type === "pack" && planOf(coach) !== "pro") {
    return NextResponse.json({ error: "pack_requires_pro" }, { status: 403 });
  }

  // ── Abonnement mensuel : souscription récurrente, pas de créneau requis ───
  if (service.type === "subscription") {
    const subPlan = planOf(coach);
    const subFeePercent = feeRatePercent(subPlan);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: service.currency || "eur",
            product_data: { name: service.name },
            unit_amount: service.price_cents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      customer_email: String(email),
      subscription_data: {
        transfer_data: { destination: coach.stripe_account_id },
        // Frais de transaction Madger prélevés sur chaque échéance, au taux
        // du plan (réaligné à chaque échéance par le webhook si le plan change).
        ...(subFeePercent > 0 ? { application_fee_percent: subFeePercent } : {}),
        metadata: {
          // `kind` distingue ces abonnements de l'abonnement Pro des coachs
          // dans le webhook (même endpoint).
          kind: "client_sub",
          plan: subPlan,
          coach_id: coach.id,
          service_id: String(service_id),
          client_email: String(email).slice(0, 254),
          // CGV acceptées en souscrivant : version figée, reportée sur
          // chaque échéance encaissée (payments.terms_version).
          terms_version: TERMS_VERSION,
        },
      },
      // Paiement EMBARQUÉ : le formulaire Stripe s'affiche dans /paiement,
      // sur madger.app, plus de départ vers une page tierce.
      ui_mode: "embedded_page",
      return_url: `${origin}/api/stripe/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        kind: "client_sub",
        coach_id: coach.id,
        coach_slug: String(coach_slug),
        service_id: String(service_id),
        first_name: String(first_name).slice(0, 80),
        last_name: last_name ? String(last_name).slice(0, 80) : "",
        email: String(email).slice(0, 254),
        phone: phone ? String(phone).slice(0, 30) : "",
        message: message ? String(message).slice(0, 500) : "",
      },
    });
    return NextResponse.json({ client_secret: session.client_secret });
  }

  // ── Séance ou pack : un créneau est obligatoire ────────────────────────────
  if (!starts_at) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Préavis minimum du coach : en deçà, plus réservable.
  const noticeMs = ((coach.min_notice_hours as number) || 2) * 3600000;
  if (new Date(String(starts_at)).getTime() < Date.now() + noticeMs) {
    return NextResponse.json({ error: "too_soon" }, { status: 400 });
  }

  // Créneau déjà pris OU bloqué à la main par le coach (is_block) : refusé
  // AVANT d'ouvrir le paiement. Jusqu'ici le conflit n'était détecté qu'au
  // retour de Stripe (remboursement automatique) : correct mais pénible ;
  // indispensable surtout en saisie libre, où le client tape n'importe
  // quelle heure. Le contrôle du fulfillment reste en double sécurité.
  const starts = new Date(String(starts_at));
  const ends = new Date(
    // Durée RELUE depuis la prestation : celle du corps de requête est
    // forgeable (fenêtre de chevauchement réduite, séance à durée libre).
    starts.getTime() +
      ((service.duration_min as number | null) ?? (Number(duration_min) || 60)) *
        60000
  );
  {
    const { data: overlapping } = await supabase
      .from("bookings")
      .select("id")
      .eq("coach_id", coach.id)
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", ends.toISOString())
      .gt("ends_at", starts.toISOString())
      .limit(1);
    if ((overlapping ?? []).length > 0) {
      return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    }
  }

  // ── Verrou de créneau (migration 0052) ────────────────────────────────────
  // Dès qu'un client ouvre le paiement, le créneau est verrouillé 15 min :
  // un second client reçoit « créneau pris » au lieu de payer pour rien.
  // Défensif : si la table n'existe pas encore, on continue sans verrou
  // (le contrôle du fulfillment reste la sécurité finale).
  let holdId: string | null = null;
  {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    // Purge opportuniste des verrous expirés : pas de cron nécessaire.
    await supabase.from("slot_holds").delete().lt("created_at", cutoff);
    const { data: held, error: holdReadError } = await supabase
      .from("slot_holds")
      .select("id")
      .eq("coach_id", coach.id)
      .gte("created_at", cutoff)
      .lt("starts_at", ends.toISOString())
      .gt("ends_at", starts.toISOString())
      .limit(1);
    if (!holdReadError) {
      if ((held ?? []).length > 0) {
        return NextResponse.json({ error: "slot_taken" }, { status: 409 });
      }
      const { data: hold, error: holdWriteError } = await supabase
        .from("slot_holds")
        .insert({
          coach_id: coach.id,
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
        })
        .select("id")
        .single();
      if (holdWriteError) {
        // 23505 = index unique : un autre client vient de verrouiller
        // exactement ce créneau dans la même seconde.
        if (holdWriteError.code === "23505") {
          return NextResponse.json({ error: "slot_taken" }, { status: 409 });
        }
      } else {
        holdId = (hold?.id as string) ?? null;
      }
    }
  }

  // Modèle Airbnb : en mode approbation, la carte est seulement AUTORISÉE
  // (empreinte bancaire). Le débit ne part que si le coach accepte ; refus ou
  // non-réponse → l'autorisation est simplement libérée, rien n'est prélevé.
  // Exception : un PACK est toujours débité à l'achat (ses crédits sont
  // libérés tout de suite) ; seule la première séance reste à approuver.
  // Si le coach refuse le pack, le client est remboursé intégralement, sur
  // son moyen de paiement d'origine.
  const approval =
    coach.booking_mode === "approval" && service.type !== "pack";

  // Paiement en 3 fois (Klarna) : packs dès 120 €, si le coach l'a activé.
  // Les moyens de paiement sont FIXÉS explicitement : carte (Apple Pay et
  // Google Pay compris) partout, Klarna en plus sur les packs éligibles
  // seulement. Sans cette liste, Stripe proposerait Klarna sur toutes les
  // séances, y compris à 45 € en empreinte, ce que le coach ne veut pas.
  const withInstallments = installmentsEligible({
    serviceType: service.type as string,
    priceCents: service.price_cents as number,
    coachEnabled: coach.installments_enabled as boolean | null,
  });

  const sessionParams = (
    methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
  ): Stripe.Checkout.SessionCreateParams => ({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: service.currency || "eur",
          product_data: { name: service.name },
          unit_amount: service.price_cents,
        },
        quantity: 1,
      },
    ],
    customer_email: String(email),
    payment_method_types: methods,
    payment_intent_data: {
      // Regroupe charge et futur transfert vers le coach (charges séparées).
      transfer_group: `coach_${coach.id}`,
      ...(approval ? { capture_method: "manual" as const } : {}),
    },
    // Paiement EMBARQUÉ (cf. abonnement ci-dessus).
    ui_mode: "embedded_page",
    return_url: `${origin}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      coach_id: coach.id,
      coach_slug: String(coach_slug),
      service_id: String(service_id),
      first_name: String(first_name).slice(0, 80),
      last_name: last_name ? String(last_name).slice(0, 80) : "",
      email: String(email).slice(0, 254),
      phone: phone ? String(phone).slice(0, 30) : "",
      starts_at: String(starts_at),
      duration_min: String((service.duration_min as number | null) ?? (Number(duration_min) || 60)),
      online: online ? "1" : "0",
      message: message ? String(message).slice(0, 500) : "",
      // CGV acceptées en payant (mention affichée sous le bouton) : la
      // version est figée ici, l'horodatage est posé au fulfillment.
      terms_version: TERMS_VERSION,
      installments: methods.length > 1 ? "1" : "0",
    },
  });

  // Moyens de paiement, du plus complet au plus simple : Klarna et Alma
  // (3x) sur les packs éligibles, puis Klarna seul si Alma n'est pas encore
  // validé par Stripe, puis la carte seule. Une liste refusée par Stripe
  // (moyen non activé sur le compte plateforme) passe à la suivante :
  // l'achat du pack n'est jamais bloqué.
  // « card » couvre aussi Apple Pay et Google Pay ; Link (paiement en un
  // clic Stripe) est fondé sur la carte, donc compatible avec l'empreinte
  // du mode approbation. Les autres moyens du Dashboard (PayPal, virement,
  // Bancontact…) ne sont pas repris ici : pas d'autorisation différée pour
  // l'approbation, frais différents, et le coach ne les a pas choisis.
  const attempts: Stripe.Checkout.SessionCreateParams.PaymentMethodType[][] =
    withInstallments
      ? [
          ["card", "link", "klarna", "alma"],
          ["card", "link", "klarna"],
          ["card", "link"],
          ["card"],
        ]
      : [["card", "link"], ["card"]];

  // Charge sur le compte plateforme (pas d'option stripeAccount) → séquestre.
  let session;
  try {
    let lastErr: unknown = null;
    for (const methods of attempts) {
      try {
        session = await stripe.checkout.sessions.create(sessionParams(methods));
        break;
      } catch (err) {
        lastErr = err;
        if (methods.length === 1) throw err;
        console.error(`[checkout] ${methods.join("+")} refused, trying next`, err);
      }
    }
    if (!session) throw lastErr ?? new Error("checkout_failed");
  } catch (err) {
    // Stripe indisponible : le verrou est rendu tout de suite, pas dans 15 min.
    if (holdId) {
      await supabase.from("slot_holds").delete().eq("id", holdId);
    }
    throw err;
  }

  // Verrou rattaché à la session Stripe : le fulfillment le libèrera dès la
  // réservation créée (ou l'expiration des 15 min s'en chargera).
  if (holdId) {
    await supabase
      .from("slot_holds")
      .update({ stripe_session_id: session.id })
      .eq("id", holdId);
  }

  return NextResponse.json({ client_secret: session.client_secret });
}
