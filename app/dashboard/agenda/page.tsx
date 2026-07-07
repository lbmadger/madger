import Topbar from "@/components/dashboard/Topbar";
import AgendaView from "@/components/dashboard/agenda/AgendaView";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Booking, ClientOption } from "@/lib/bookings/types";
import type { Availability } from "@/lib/availability/types";
import type { ClientProfile } from "@/lib/health/bmi";

// Page Agenda. On charge les séances (avec le client joint), la liste des
// clients pour le sélecteur du formulaire et les disponibilités (affichées en
// fond de la vue semaine) — le tout borné par RLS au coach.
export default async function AgendaPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();

  const [{ data: bookings }, { data: clients }, { data: availabilities }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("*, clients(first_name, last_name)")
        // Fenêtre glissante : sans borne, PostgREST plafonne à 1000 lignes et
        // un gros historique évincerait silencieusement les séances futures.
        .gte(
          "starts_at",
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order("starts_at", { ascending: true })
        .limit(1000),
      supabase
        .from("clients")
        .select("id, first_name, last_name")
        .order("first_name", { ascending: true }),
      supabase.from("availabilities").select("*"),
    ]);

  // Fiche sportive des clients (objectifs, niveau, mensurations), affichée
  // dans le détail d'une séance. Chemin RLS existant : conversations du
  // coach → client_profiles lisibles ; client_crm_id fait le pont avec les
  // clients des réservations.
  const profiles: Record<string, ClientProfile> = {};
  {
    const { data: convs } = await supabase
      .from("conversations")
      .select("client_id, client_crm_id")
      .not("client_crm_id", "is", null)
      .limit(500);
    const authIds = Array.from(
      new Set((convs ?? []).map((c) => c.client_id as string))
    );
    if (authIds.length) {
      const { data: profs } = await supabase
        .from("client_profiles")
        .select("*")
        .in("id", authIds);
      const byAuthId = new Map(
        (profs ?? []).map((p) => [p.id as string, p as ClientProfile])
      );
      for (const c of convs ?? []) {
        const prof = byAuthId.get(c.client_id as string);
        if (prof && c.client_crm_id) {
          profiles[c.client_crm_id as string] = prof;
        }
      }
    }
  }

  return (
    <>
      <Topbar title={dict.agenda.title} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AgendaView
          initialBookings={(bookings ?? []) as Booking[]}
          clients={(clients ?? []) as ClientOption[]}
          availabilities={(availabilities ?? []) as Availability[]}
          profiles={profiles}
        />
      </main>
    </>
  );
}
