import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { isAdminEmail } from "@/lib/admin";
import DisputeResolver, { type Dispute } from "@/components/admin/DisputeResolver";

export const dynamic = "force-dynamic";

// Espace admin : liste des litiges à trancher (paiements gelés). Réservé aux
// e-mails listés dans ADMIN_EMAILS. Résolution via /api/admin/resolve-payment.
export default async function AdminDisputesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    notFound();
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const disputes: Dispute[] = [];
  if (serviceKey) {
    const admin = createAdmin(SUPABASE_URL, serviceKey);
    const { data } = await admin
      .from("payments")
      .select(
        "id, amount_cents, currency, dispute_reason, disputed_at, coaches(first_name, last_name), clients(first_name, last_name), bookings(starts_at)"
      )
      .eq("escrow_status", "disputed")
      .order("disputed_at", { ascending: true });

    for (const p of data ?? []) {
      const coach = Array.isArray(p.coaches) ? p.coaches[0] : p.coaches;
      const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
      const booking = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
      disputes.push({
        id: p.id as string,
        amount_cents: p.amount_cents as number,
        currency: p.currency as string,
        dispute_reason: (p.dispute_reason as string | null) ?? null,
        disputed_at: (p.disputed_at as string | null) ?? null,
        coach_name: [coach?.first_name, coach?.last_name].filter(Boolean).join(" "),
        client_name: [client?.first_name, client?.last_name].filter(Boolean).join(" "),
        starts_at: (booking?.starts_at as string | null) ?? null,
      });
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
        Litiges à trancher
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        {disputes.length} paiement(s) gelé(s) en attente de décision.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {disputes.length === 0 ? (
          <p className="rounded-2xl border border-border bg-bg-card p-6 text-center text-sm text-text-muted">
            Aucun litige en cours.
          </p>
        ) : (
          disputes.map((d) => <DisputeResolver key={d.id} dispute={d} />)
        )}
      </div>
    </main>
  );
}
