import Topbar from "@/components/dashboard/Topbar";
import AvailabilityEditor from "@/components/dashboard/availability/AvailabilityEditor";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Availability } from "@/lib/availability/types";

// Page Disponibilités : créneaux types récurrents du coach.
export default async function AvailabilityPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();

  const { data } = await supabase
    .from("availabilities")
    .select("*")
    .order("start_time", { ascending: true });

  return (
    <>
      <Topbar title={dict.availability.title} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <p className="mb-5 text-sm text-text-muted">
          {dict.availability.subtitle}
        </p>
        <AvailabilityEditor initial={(data ?? []) as Availability[]} />
      </main>
    </>
  );
}
