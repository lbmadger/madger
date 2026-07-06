import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { PencilIcon } from "@/components/ui/icons";
import AvailabilityEditor from "@/components/dashboard/availability/AvailabilityEditor";
import WeekView from "@/components/dashboard/agenda/WeekView";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Availability } from "@/lib/availability/types";
import type { Booking } from "@/lib/bookings/types";

// Page Disponibilités. Tant qu'aucun créneau n'existe : l'éditeur (première
// configuration). Dès que les créneaux sont choisis : le calendrier de la
// semaine (dispos en fond + séances) — la modification se fait dans Réglages.
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                {dict.availability.calendarNote}
              </p>
              <Link
                href="/dashboard/reglages#disponibilites"
                className="shrink-0 rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-base transition-colors hover:border-accent"
              >
                <PencilIcon size={12} className="mr-1.5 inline-block align-[-2px]" />{dict.availability.editInSettings}
              </Link>
            </div>
            <WeekView
              bookings={(bookings ?? []) as Booking[]}
              availabilities={availabilities}
            />
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
