import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminClients() {
  const admin = createAdminClient();
  const { data: clients } = admin
    ? await admin
        .from("clients")
        .select(
          "id, first_name, last_name, email, phone, created_at, coaches(first_name, last_name)"
        )
        .order("created_at", { ascending: false })
        .limit(300)
    : { data: [] };

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Clients</h1>
      <p className="mt-1 text-sm text-text-muted">
        {(clients ?? []).length} client(s).
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-card text-left text-xs uppercase tracking-wide text-text-dim">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Coach</th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((c) => {
              const coach = Array.isArray(c.coaches) ? c.coaches[0] : c.coaches;
              return (
                <tr key={c.id as string} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium text-text-base">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{c.email || "-"}</td>
                  <td className="px-4 py-3 text-text-muted">{c.phone || "-"}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {[coach?.first_name, coach?.last_name].filter(Boolean).join(" ") ||
                      "-"}
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
