import Link from "next/link";
import LaunchPrice from "@/components/subscription/LaunchPrice";

// Carte Pro compacte, glissée dans les pages du dashboard quand le coach est
// en Gratuit (Paiements, Statistiques, Factures). Rendue côté serveur :
// les textes arrivent déjà traduits par la page.
export default function ProUpsellCard({
  title,
  desc,
  cta,
  locale,
  perMonth,
  className = "",
}: {
  title: string;
  desc: string;
  cta: string;
  locale: string;
  perMonth: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-accent/25 bg-accent/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-base">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{desc}</p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <LaunchPrice locale={locale} suffix={perMonth} size="sm" />
        <Link
          href="/dashboard/abonnement"
          className="rounded-full bg-accent px-4 py-2 text-center text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
