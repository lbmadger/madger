import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPro } from "@/lib/subscription/plan";
import AnimatedStat from "@/components/dashboard/AnimatedStat";
import AdminMap, { type AdminMapPoint } from "@/components/admin/AdminMap";

export const dynamic = "force-dynamic";

// Vue d'ensemble admin façon control room : gros compteurs animés (coachs,
// clients, inscrits) + carte de répartition géographique des coachs.
export default async function AdminOverview() {
  const admin = createAdminClient();

  let coaches = 0;
  let clients = 0;
  let early = 0;
  let bookings = 0;
  let disputes = 0;
  let released = 0;
  let commission = 0;
  let proCount = 0;
  let points: AdminMapPoint[] = [];

  if (admin) {
    const head = { count: "exact" as const, head: true };
    const [c1, c2, c3, c4, c5, c6, comm, geo] = await Promise.all([
      admin.from("coaches").select("id", head),
      admin.from("clients").select("id", head),
      admin.from("early_access").select("id", head),
      admin.from("bookings").select("id", head),
      admin.from("payments").select("id", head).eq("escrow_status", "disputed"),
      admin.from("payments").select("id", head).eq("escrow_status", "released"),
      // Somme en base (migration 0040) : exacte à tout volume, là où un
      // select de lignes plafonnerait à 1000.
      admin.rpc("admin_total_commission"),
      admin
        .from("coaches")
        .select("first_name, last_name, city, lat, lng, pro_until")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .limit(1000),
    ]);
    coaches = c1.count ?? 0;
    clients = c2.count ?? 0;
    early = c3.count ?? 0;
    bookings = c4.count ?? 0;
    disputes = c5.count ?? 0;
    released = c6.count ?? 0;
    commission = Number(comm.data ?? 0) || 0;

    points = (geo.data ?? []).map((c) => {
      const pro = isPro(c.pro_until as string | null);
      if (pro) proCount++;
      return {
        lat: c.lat as number,
        lng: c.lng as number,
        label:
          [
            [c.first_name, c.last_name].filter(Boolean).join(" "),
            c.city as string | null,
          ]
            .filter(Boolean)
            .join(" · ") || "Coach",
        pro,
      };
    });
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Vue d'ensemble</h1>
      <p className="mt-1 text-sm text-text-muted">
        Suivi de l'activité Madger en temps réel.
      </p>

      {/* Litiges : l'alerte AVANT les chiffres, on ne l'enterre pas. */}
      {disputes > 0 && (
        <Link
          href="/admin/litiges"
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/[0.06] px-4 py-3 transition-colors hover:border-danger/50"
        >
          <p className="text-sm font-semibold text-text-base">
            {disputes} litige{disputes > 1 ? "s" : ""} en cours
          </p>
          <span className="shrink-0 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white">
            Traiter
          </span>
        </Link>
      )}

      {/* Compteurs héros : les deux populations, en grand. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Link href="/admin/coachs" className="block transition-transform hover:-translate-y-0.5">
          <AnimatedStat label="Coachs" value={coaches} index={0} />
        </Link>
        <Link href="/admin/clients" className="block transition-transform hover:-translate-y-0.5">
          <AnimatedStat label="Clients" value={clients} index={1} />
        </Link>
      </div>

      {/* Second rang : le reste de l'activité. */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <AnimatedStat label="Inscrits accès anticipé" value={early} index={2} />
        <AnimatedStat label="Séances" value={bookings} index={3} />
        <AnimatedStat label="Séances réglées" value={released} index={4} />
        <AnimatedStat
          label="Commissions Madger"
          value={commission}
          kind="currency"
          index={5}
        />
      </div>

      {/* Répartition géographique des coachs (mood control room). */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-base">
              <span className="glow-dot h-2 w-2 rounded-full bg-accent" />
              Répartition des coachs
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Origine géographique des coachs inscrits (position du profil)
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              Pro ({proCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent/50" />
              Basic ({Math.max(0, points.length - proCount)})
            </span>
          </div>
        </div>
        {points.length === 0 ? (
          <div className="flex h-[420px] items-center justify-center rounded-2xl border border-border bg-bg-card">
            <p className="max-w-xs text-center text-sm text-text-dim">
              La carte s'allume dès qu'un coach renseigne sa ville : chaque
              point est un coach.
            </p>
          </div>
        ) : (
          <AdminMap points={points} />
        )}
      </section>
    </>
  );
}
