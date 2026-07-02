import Topbar from "@/components/dashboard/Topbar";
import SettingsForm from "@/components/dashboard/settings/SettingsForm";
import AvailabilityEditor from "@/components/dashboard/availability/AvailabilityEditor";
import { createClient } from "@/lib/supabase/server";
import { getCoach } from "@/lib/coach/getCoach";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Availability } from "@/lib/availability/types";

// Réglages : profil public, activité, réservation, annulation, langue — et
// l'édition des créneaux de dispo (la page Disponibilités montre le
// calendrier une fois les créneaux choisis).
export default async function SettingsPage() {
  const { dict } = getServerDictionary();
  const { coach } = await getCoach();
  const supabase = createClient();
  const { data: avail } = await supabase
    .from("availabilities")
    .select("*")
    .order("start_time", { ascending: true });

  return (
    <>
      <Topbar title={dict.settings.title} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {coach && <SettingsForm coach={coach} />}

        {/* Créneaux de dispo (ancre depuis la page Disponibilités) */}
        <section
          id="disponibilites"
          className="mt-5 scroll-mt-20 rounded-2xl border border-border bg-bg-card p-5 sm:p-6"
        >
          <h2 className="text-base font-semibold text-text-base">
            {dict.availability.title}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {dict.availability.subtitle}
          </p>
          <div className="mt-4">
            <AvailabilityEditor initial={(avail ?? []) as Availability[]} />
          </div>
        </section>
      </main>
    </>
  );
}
