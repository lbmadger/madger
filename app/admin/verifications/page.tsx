import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import VerifyActions from "@/components/admin/VerifyActions";

export const dynamic = "force-dynamic";

// File d'attente des vérifications de diplôme. Chaque demande « pending »
// affiche un lien signé (temporaire) vers le document déposé et les actions
// valider / refuser.
export default async function AdminVerifications() {
  const admin = createAdminClient();

  const { data: coaches } = admin
    ? await admin
        .from("coaches")
        .select(
          "id, first_name, last_name, slug, verification_doc_path, verification_submitted_at"
        )
        .eq("verification_status", "pending")
        .order("verification_submitted_at", { ascending: true })
        .limit(100)
    : { data: [] };

  // Lien signé (10 min) vers chaque diplôme (bucket privé).
  const rows = await Promise.all(
    (coaches ?? []).map(async (c) => {
      let docUrl: string | null = null;
      if (admin && c.verification_doc_path) {
        const { data } = await admin.storage
          .from("diplomas")
          .createSignedUrl(c.verification_doc_path as string, 600);
        docUrl = data?.signedUrl ?? null;
      }
      return { ...c, docUrl };
    })
  );

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Vérifications</h1>
      <p className="mt-1 text-sm text-text-muted">
        {rows.length} demande(s) en attente.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-bg-card p-8 text-center text-sm text-text-dim">
          Aucune demande en attente.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((c) => {
            const name =
              [c.first_name, c.last_name].filter(Boolean).join(" ") || "-";
            return (
              <li
                key={c.id as string}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-text-base">{name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                    {c.slug && (
                      <Link
                        href={`/${c.slug}`}
                        target="_blank"
                        className="text-text-muted underline hover:text-accent"
                      >
                        /{c.slug as string}
                      </Link>
                    )}
                    {c.docUrl ? (
                      <a
                        href={c.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-accent hover:underline"
                      >
                        Voir le diplôme →
                      </a>
                    ) : (
                      <span className="text-text-dim">Document introuvable</span>
                    )}
                  </div>
                </div>
                <VerifyActions coachId={c.id as string} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
