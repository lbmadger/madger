import type { SupabaseClient } from "@supabase/supabase-js";

// Un avis ne peut venir que d'une séance réellement ACHETÉE sur Madger :
// paiement encaissé pour cette réservation ou pour ce client chez ce coach
// (pack, abonnement), ou crédit d'un pack payé. Une séance posée à la main
// par le coach depuis son agenda, avec une fiche client libre, n'ouvre pas
// le droit de noter : sinon un coach pourrait se fabriquer des avis. La
// même règle sert au dépôt (/api/reviews) et à la relance (cron), pour ne
// jamais inviter un client à noter puis lui répondre « pas éligible ».
export async function reviewEligible(
  supabase: SupabaseClient,
  booking: {
    id: string;
    coach_id: string;
    client_id: string | null;
    pack_credit_id?: string | null;
  }
): Promise<boolean> {
  if (!booking.client_id) return false;
  const [{ count: paidCount }, packRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", booking.coach_id)
      .or(`booking_id.eq.${booking.id},client_id.eq.${booking.client_id}`)
      .in("escrow_status", ["held", "released", "disputed"]),
    booking.pack_credit_id
      ? supabase
          .from("pack_credits")
          .select("payment_id")
          .eq("id", booking.pack_credit_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { payment_id?: string | null } | null }),
  ]);
  return (paidCount ?? 0) > 0 || Boolean(packRes.data?.payment_id);
}
