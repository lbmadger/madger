import Topbar from "@/components/dashboard/Topbar";
import ClientsView from "@/components/dashboard/clients/ClientsView";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Client } from "@/lib/clients/types";

// Page Clients. Récupère la liste côté serveur (bornée par RLS au coach
// connecté) et la passe au composant de vue interactif.
export default async function ClientsPage() {
  const { dict } = getServerDictionary();
  const supabase = createClient();

  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const clients = (data ?? []) as Client[];

  return (
    <>
      <Topbar title={dict.clients.title} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ClientsView initialClients={clients} />
      </main>
    </>
  );
}
