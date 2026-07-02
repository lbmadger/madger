import Topbar from "@/components/dashboard/Topbar";
import ServicesView from "@/components/dashboard/services/ServicesView";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Service } from "@/lib/services/types";

// Page Prestations : les offres du coach (séance, pack, abonnement).
export default async function ServicesPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();

  const { data } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <>
      <Topbar title={dict.services.title} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ServicesView initialServices={(data ?? []) as Service[]} />
      </main>
    </>
  );
}
