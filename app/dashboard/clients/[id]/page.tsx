import { notFound } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import ClientDetail from "@/components/dashboard/clients/ClientDetail";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Client } from "@/lib/clients/types";

// Fiche d'un client. RLS garantit qu'on ne peut charger que ses propres
// clients : une fiche inexistante ou appartenant à un autre coach → 404.
export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { dict } = getServerDictionary();
  const supabase = createClient();

  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const client = data as Client;
  const title = [client.first_name, client.last_name].filter(Boolean).join(" ");

  return (
    <>
      <Topbar title={title || dict.clients.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ClientDetail client={client} />
      </main>
    </>
  );
}
