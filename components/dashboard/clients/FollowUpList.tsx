import Link from "next/link";

export type FollowUp = {
  clientId: string;
  clientName: string;
  kind: "inactive" | "pack_expiring";
  detail: string;
};

// Clients à relancer, en tête de la page Clients : sans séance depuis 14
// jours (et rien à venir) ou pack qui expire sous 7 jours avec des séances
// restantes. Calculé côté serveur, même règle que l'alerte email du cron.
export default function FollowUpList({
  items,
  title,
  cta,
}: {
  items: FollowUp[];
  title: string;
  cta: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-5 rounded-2xl border border-warning/30 bg-warning/[0.05] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-warning">
        {title} · {items.length}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.slice(0, 8).map((it) => (
          <li
            key={`${it.kind}-${it.clientId}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate">
              <span className="font-semibold text-text-base">{it.clientName}</span>
              <span className="text-text-muted"> · {it.detail}</span>
            </span>
            <Link
              href={`/dashboard/clients/${it.clientId}`}
              className="shrink-0 rounded-full border border-border-strong px-3 py-1 text-[11px] font-semibold text-text-base transition-colors hover:border-accent"
            >
              {cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
