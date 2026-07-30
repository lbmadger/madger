import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPro } from "@/lib/subscription/plan";

export const dynamic = "force-dynamic";

export default async function AdminCoaches() {
  const admin = createAdminClient();
  const { data: coaches } = admin
    ? await admin
        .from("coaches")
        .select(
          "id, first_name, last_name, slug, city, listed, pro_until, stripe_charges_enabled, cancellation_policy, created_at, onboarding_completed"
        )
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };

  // Emails : ils vivent dans Supabase Auth (pas dupliqués dans coaches).
  // On les joint ici via l'API admin, pour contacter/relancer un coach
  // directement depuis cette page (ex. inscription Google abandonnée).
  const emailById = new Map<string, string>();
  if (admin) {
    try {
      const { data: usersPage } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const u of usersPage?.users ?? []) {
        if (u.email) emailById.set(u.id, u.email);
      }
    } catch {
      /* best-effort : la colonne affichera "-" */
    }
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Coachs</h1>
      <p className="mt-1 text-sm text-text-muted">
        {(coaches ?? []).length} coach(s) inscrit(s).
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-card text-left text-xs uppercase tracking-wide text-text-dim">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Offre</th>
              <th className="px-4 py-3">Encaisse</th>
              <th className="px-4 py-3">Public</th>
            </tr>
          </thead>
          <tbody>
            {(coaches ?? []).map((c) => {
              const name =
                [c.first_name, c.last_name].filter(Boolean).join(" ") || "-";
              const pro = isPro(c.pro_until as string | null);
              const email = emailById.get(c.id as string);
              const abandoned = !c.onboarding_completed;
              return (
                <tr key={c.id as string} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium text-text-base">
                    {c.slug ? (
                      <Link href={`/${c.slug}`} target="_blank" className="hover:text-accent">
                        {name}
                      </Link>
                    ) : (
                      <span>
                        {name}
                        {abandoned && (
                          <span className="ml-2 rounded-full border border-warning/40 px-2 py-0.5 text-[10px] font-medium text-warning">
                            onboarding abandonné
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {email ? (
                      <a href={`mailto:${email}`} className="hover:text-accent">
                        {email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{c.city || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={pro ? "text-accent" : "text-text-muted"}>
                      {pro ? "Pro" : "Gratuit"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {c.stripe_charges_enabled ? "✅" : "-"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {c.listed ? "✅" : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
