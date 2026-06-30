import Topbar from "@/components/dashboard/Topbar";
import AgendaView from "@/components/dashboard/agenda/AgendaView";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Booking, ClientOption } from "@/lib/bookings/types";

// Page Agenda. On charge les séances (avec le client joint) et la liste des
// clients pour le sélecteur du formulaire — le tout borné par RLS au coach.
export default async function AgendaPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();

  const [{ data: bookings }, { data: clients }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, clients(first_name, last_name)")
      .order("starts_at", { ascending: true }),
    supabase
      .from("clients")
      .select("id, first_name, last_name")
      .order("first_name", { ascending: true }),
  ]);

  return (
    <>
      <Topbar title={dict.agenda.title} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AgendaView
          initialBookings={(bookings ?? []) as Booking[]}
          clients={(clients ?? []) as ClientOption[]}
        />
      </main>
    </>
  );
}
