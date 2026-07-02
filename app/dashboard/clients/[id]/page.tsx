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

  // Packs de séances achetés par ce client (RLS : seuls ceux du coach).
  const { data: packRows } = await supabase
    .from("pack_credits")
    .select("id, total, used, services(name)")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false });
  const packs = (packRows ?? []).map((p) => {
    const svc = Array.isArray(p.services) ? p.services[0] : p.services;
    return {
      id: p.id as string,
      total: p.total as number,
      used: p.used as number,
      name: ((svc as { name?: string } | null)?.name as string) ?? "Pack",
    };
  });

  return (
    <>
      <Topbar title={title || dict.clients.title} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {packs.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {packs.map((p) => {
              const left = Math.max(0, p.total - p.used);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-card px-4 py-3"
                >
                  <p className="min-w-0 truncate text-sm font-medium text-text-base">
                    🎟️ {p.name}
                    <span className="text-text-muted">
                      {" "}
                      · {p.used}/{p.total}
                    </span>
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      left > 0
                        ? "bg-accent/10 text-accent"
                        : "border border-border-strong text-text-dim"
                    }`}
                  >
                    {left > 0
                      ? `${left} ${left === 1 ? dict.packs.remainingOne : dict.packs.remainingMany}`
                      : dict.packs.empty}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <ClientDetail client={client} />
      </main>
    </>
  );
}
