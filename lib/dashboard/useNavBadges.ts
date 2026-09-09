"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Pastilles numérotées du menu coach (façon iOS), par entrée :
//  - Agenda   : séances à confirmer (action)
//  - Clients  : remboursements de pack demandés (action)
//  - Factures, Paiements, Avis : nouveautés depuis la dernière visite de la
//    section (coaches.nav_seen, horodatage par section ; visiter la section
//    remet la pastille à zéro).
// Messages garde son propre calcul (useUnreadCount).
//
// Un seul chargeur partagé entre la barre latérale et la barre mobile (les
// deux sont montées en même temps) : une série de requêtes toutes les 2 min,
// au changement de page, au retour sur l'onglet, et en temps réel sur
// bookings / pack_credits.
export type NavBadges = Record<string, number>;

const SEEN_SECTIONS = ["factures", "paiements", "avis"] as const;
type Seen = Partial<Record<(typeof SEEN_SECTIONS)[number], string>>;

let state: NavBadges = {};
const listeners = new Set<(b: NavBadges) => void>();
let started = false;
let loading: Promise<void> | null = null;
let currentPath = "";

function emit(next: NavBadges) {
  state = next;
  listeners.forEach((l) => l(next));
}

async function load(): Promise<void> {
  if (typeof document !== "undefined" && document.hidden) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coach } = await supabase
        .from("coaches")
        .select("nav_seen")
        .eq("id", user.id)
        .maybeSingle();
      const seen: Seen = { ...((coach?.nav_seen as Seen | null) ?? {}) };
      const nowIso = new Date().toISOString();
      let dirty = false;
      // La section ouverte est vue maintenant ; une section jamais visitée
      // part de maintenant (pas de pastille sur tout l'historique).
      const current = SEEN_SECTIONS.find((s) => currentPath.startsWith(`/dashboard/${s}`));
      if (current) {
        seen[current] = nowIso;
        dirty = true;
      }
      for (const s of SEEN_SECTIONS) {
        if (!seen[s]) {
          seen[s] = nowIso;
          dirty = true;
        }
      }
      if (dirty) {
        await supabase.from("coaches").update({ nav_seen: seen }).eq("id", user.id);
      }

      const [pending, refunds, invoices, payments, reviews] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .gte("ends_at", nowIso),
        supabase
          .from("pack_credits")
          .select("id", { count: "exact", head: true })
          .eq("refund_request_status", "pending")
          .eq("status", "active"),
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .gt("created_at", seen.factures as string),
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .gt("paid_at", seen.paiements as string),
        supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .gt("created_at", seen.avis as string),
      ]);
      emit({
        "/dashboard/agenda": pending.count ?? 0,
        "/dashboard/clients": refunds.count ?? 0,
        "/dashboard/factures": current === "factures" ? 0 : (invoices.count ?? 0),
        "/dashboard/paiements": current === "paiements" ? 0 : (payments.count ?? 0),
        "/dashboard/avis": current === "avis" ? 0 : (reviews.count ?? 0),
      });
    } catch {
      /* best-effort : pas de pastille plutôt qu'une erreur */
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  setInterval(load, 120_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load();
  });
  const supabase = createClient();
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    const filter = `coach_id=eq.${data.user.id}`;
    supabase
      .channel("nav-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pack_credits", filter },
        () => load()
      )
      .subscribe();
  });
}

export function useNavBadges(): NavBadges {
  const pathname = usePathname();
  const [badges, setBadges] = useState<NavBadges>(state);

  useEffect(() => {
    listeners.add(setBadges);
    start();
    return () => {
      listeners.delete(setBadges);
    };
  }, []);

  useEffect(() => {
    currentPath = pathname ?? "";
    load();
  }, [pathname]);

  return badges;
}
