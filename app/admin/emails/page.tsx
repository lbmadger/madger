import TestEmailButton from "@/components/admin/TestEmailButton";
import BroadcastCampaigns from "@/components/admin/BroadcastCampaigns";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EMAILS = [
  "Confirmation de réservation (client)",
  "Notification de nouvelle séance (coach)",
  "Rappel J-1 (client)",
  "Remboursement après annulation (client)",
  "Fonds libérés / séance réglée (coach)",
  "Alerte litige (admin)",
];

export default async function AdminEmails() {
  // Restants par campagne (colonne d'horodatage nulle = pas encore reçu).
  // -1 = colonne absente (migration 0050 pas passée) : le bouton l'affichera
  // en erreur explicite plutôt que d'envoyer dans le vide.
  const admin = createAdminClient();
  let introLeft = 0;
  let storyLeft = 0;
  let promoLeft = 0;
  if (admin) {
    const head = { count: "exact" as const, head: true };
    const [a, b, c] = await Promise.all([
      admin.from("early_access").select("id", head).is("intro_sent_at", null),
      admin.from("early_access").select("id", head).is("story_sent_at", null),
      admin
        .from("promo_codes")
        .select("code", head)
        .not("email", "is", null)
        .is("sent_at", null)
        .eq("active", true),
    ]);
    introLeft = a.error ? -1 : (a.count ?? 0);
    storyLeft = b.error ? -1 : (b.count ?? 0);
    promoLeft = c.error ? -1 : (c.count ?? 0);
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Emails</h1>

      {/* ── Campagnes liste d'attente ── */}
      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-dim">
        Campagnes liste d'attente
      </h2>
      <p className="mb-3 mt-1 text-sm text-text-muted">
        Teste d'abord sur ton email, puis envoie. Rejouer un bouton n'envoie
        jamais deux fois au même inscrit.
      </p>
      {introLeft === -1 || storyLeft === -1 ? (
        <p className="rounded-2xl border border-warning/30 bg-warning/[0.06] px-4 py-3 text-xs text-text-base">
          Migration 0050 pas encore passée dans Supabase : les colonnes de
          suivi d'envoi manquent.
        </p>
      ) : (
        <BroadcastCampaigns
          campaigns={[
            {
              key: "intro",
              title: "Email 1 · Voilà ce qu'on te prépare",
              desc: "La promesse + la démo madger.app/exemple. À envoyer dès maintenant.",
              remaining: introLeft,
            },
            {
              key: "story",
              title: "Email 2 · Les coulisses (le manifeste)",
              desc: "Les coutures entre les outils. À envoyer environ une semaine avant le lancement.",
              remaining: storyLeft,
            },
            {
              key: "promo",
              title: "Email 3 · Lancement : codes promo 3 mois Pro",
              desc: "Chaque inscrit reçoit SON code personnel. À déclencher LE JOUR du lancement.",
              remaining: promoLeft,
              endpoint: "/api/admin/send-promo-codes",
              noTest: true,
            },
          ]}
        />
      )}

      {/* ── Emails transactionnels ── */}
      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-text-dim">
        Emails transactionnels
      </h2>
      <p className="mb-3 mt-1 text-sm text-text-muted">
        Envoie un exemplaire de chaque email transactionnel pour vérifier le
        rendu. Nécessite{" "}
        <code className="text-text-base">RESEND_API_KEY</code> sur le serveur.
      </p>
      <div className="max-w-md">
        <TestEmailButton />
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-text-base">
          Emails inclus ({EMAILS.length})
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {EMAILS.map((e) => (
            <li key={e} className="flex items-center gap-2 text-sm text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {e}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
