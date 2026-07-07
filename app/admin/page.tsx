import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const admin = createAdminClient();

  let coaches = 0;
  let clients = 0;
  let bookings = 0;
  let disputes = 0;
  let released = 0;
  let commission = 0;

  if (admin) {
    const head = { count: "exact" as const, head: true };
    const [c1, c2, c3, c4, c5, comm] = await Promise.all([
      admin.from("coaches").select("id", head),
      admin.from("clients").select("id", head),
      admin.from("bookings").select("id", head),
      admin.from("payments").select("id", head).eq("escrow_status", "disputed"),
      admin.from("payments").select("id", head).eq("escrow_status", "released"),
      admin.from("payments").select("commission_cents").not("commission_cents", "is", null),
    ]);
    coaches = c1.count ?? 0;
    clients = c2.count ?? 0;
    bookings = c3.count ?? 0;
    disputes = c4.count ?? 0;
    released = c5.count ?? 0;
    commission = (comm.data ?? []).reduce(
      (s, p) => s + ((p.commission_cents as number) || 0),
      0
    );
  }

  const cards = [
    { label: "Coachs", value: String(coaches), href: "/admin/coachs" },
    { label: "Clients", value: String(clients), href: "/admin/clients" },
    { label: "Séances", value: String(bookings) },
    { label: "Litiges en cours", value: String(disputes), href: "/admin/litiges", alert: disputes > 0 },
    { label: "Séances réglées", value: String(released) },
    {
      label: "Commissions Madger",
      value: (commission / 100).toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
      }),
    },
  ];

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Vue d'ensemble</h1>
      <p className="mt-1 text-sm text-text-muted">
        Suivi de l'activité Madger en temps réel.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const inner = (
            <div
              className={`rounded-2xl border p-4 ${
                c.alert
                  ? "border-danger/30 bg-danger/[0.04]"
                  : "border-border bg-bg-card"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
                {c.label}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-text-base">
                {c.value}
              </p>
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="block transition-opacity hover:opacity-80">
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>
    </>
  );
}
