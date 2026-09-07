import Topbar from "@/components/dashboard/Topbar";
import ClientsView from "@/components/dashboard/clients/ClientsView";
import FollowUpList, {
  type FollowUp,
} from "@/components/dashboard/clients/FollowUpList";
import { createClient } from "@/lib/supabase/server";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Client } from "@/lib/clients/types";

export const dynamic = "force-dynamic";

// Page Clients. Récupère la liste côté serveur (bornée par RLS au coach
// connecté) et la passe au composant de vue interactif. En tête : les
// clients à relancer (lot 3), même règle que l'alerte email du matin.
export default async function ClientsPage() {
  const { dict, locale } = getServerDictionary();
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const supabase = createClient();

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const [{ data }, { data: recent }, { data: packs }] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("client_id, ends_at")
      .eq("is_block", false)
      .neq("status", "cancelled")
      .not("client_id", "is", null)
      .gte("ends_at", new Date(now - 90 * 86400000).toISOString())
      .order("ends_at", { ascending: false })
      .limit(3000),
    supabase
      .from("pack_credits")
      .select("id, client_id, total, used, expires_at")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lte("expires_at", new Date(now + 7 * 86400000).toISOString())
      .gt("expires_at", nowIso),
  ]);

  const clients = (data ?? []) as Client[];
  const nameOf = new Map(
    clients.map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" ") || "Client",
    ])
  );

  const followUps: FollowUp[] = [];
  for (const pk of packs ?? []) {
    const remaining = Math.max(0, (pk.total as number) - (pk.used as number));
    if (remaining === 0) continue;
    const id = pk.client_id as string;
    followUps.push({
      clientId: id,
      clientName: nameOf.get(id) ?? "Client",
      kind: "pack_expiring",
      detail: dict.clients.followUpExpiring
        .replace(
          "{date}",
          new Date(pk.expires_at as string).toLocaleDateString(loc, {
            day: "numeric",
            month: "short",
          })
        )
        .replace("{n}", String(remaining)),
    });
  }
  const lastEnd = new Map<string, string>();
  const hasFuture = new Set<string>();
  for (const b of recent ?? []) {
    const id = b.client_id as string;
    if ((b.ends_at as string) > nowIso) {
      hasFuture.add(id);
      continue;
    }
    if (!lastEnd.has(id)) lastEnd.set(id, b.ends_at as string);
  }
  const cutoff14 = new Date(now - 14 * 86400000).toISOString();
  for (const [id, end] of Array.from(lastEnd.entries())) {
    if (hasFuture.has(id) || end > cutoff14) continue;
    if (!nameOf.has(id)) continue;
    const days = Math.floor((now - new Date(end).getTime()) / 86400000);
    followUps.push({
      clientId: id,
      clientName: nameOf.get(id) ?? "Client",
      kind: "inactive",
      detail: dict.clients.followUpInactive.replace("{n}", String(days)),
    });
  }

  return (
    <>
      <Topbar title={dict.clients.title} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <FollowUpList
          items={followUps}
          title={dict.clients.followUpTitle}
          cta={dict.clients.followUpCta}
        />
        <ClientsView initialClients={clients} />
      </main>
    </>
  );
}
