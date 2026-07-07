import Topbar from "@/components/dashboard/Topbar";
import AvailabilityEditor from "@/components/dashboard/availability/AvailabilityEditor";
import WeekView from "@/components/dashboard/agenda/WeekView";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Availability } from "@/lib/availability/types";
import type { Booking } from "@/lib/bookings/types";

// Page Disponibilités. Tant qu'aucun créneau n'existe : l'éditeur seul
// (première configuration). Ensuite : le calendrier de la semaine (dispos en
// fond + séances) AVEC l'éditeur juste en dessous. On modifie ses horaires
// ici, là où on les regarde, sans détour par les réglages.
export default async function AvailabilityPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();

  const [{ data: avail }, { data: bookings }] = await Promise.all([
    supabase
      .from("availabilities")
      .select("*")
      .order("start_time", { ascending: true }),
    supabase.from("bookings").select("*, clients(first_name, last_name)"),
  ]);

  const availabilities = (avail ?? []) as Availability[];
  const hasSlots = availabilities.length > 0;

  return (
    <>
      <Topbar title={dict.availability.title} />
      <main
        className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 ${
          hasSlots ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        {hasSlots ? (
          <>
            <p className="mb-4 text-sm text-text-muted">
              {dict.availability.calendarNote}
            </p>
            <WeekView
              bookings={(bookings ?? []) as Booking[]}
              availabilities={availabilities}
            />
            <section className="mt-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-dim">
                {dict.availability.editTitle}
              </h2>
              <AvailabilityEditor initial={availabilities} />
            </section>
          </>
        ) : (
          <>
            <p className="mb-5 text-sm text-text-muted">
              {dict.availability.subtitle}
            </p>
            <AvailabilityEditor initial={availabilities} />
          </>
        )}
      </main>
    </>
  );
}
