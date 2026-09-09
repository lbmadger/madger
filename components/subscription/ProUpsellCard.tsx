import Link from "next/link";
import {
  launchOfferActive,
  monthlyOffer,
} from "@/lib/subscription/offer";
import LaunchPrice from "@/components/subscription/LaunchPrice";

// Carte Pro compacte, glissée dans les pages du dashboard quand le coach est
// en Gratuit (Paiements, Statistiques, Factures). Rendue côté serveur :
// les textes arrivent déjà traduits par la page.
export default function ProUpsellCard({
  title,
  desc,
  cta,
  locale,
  offerBadge,
  perMonth,
  offerFrom,
  offerDaysLeft,
  offerLastDay,
  className = "",
}: {
  title: string;
  desc: string;
  cta: string;
  locale: string;
  offerBadge: string;
  perMonth: string;
  offerFrom: string; // avec {date}
  offerDaysLeft: string; // avec {n}
  offerLastDay: string;
  className?: string;
}) {
  const offer = launchOfferActive();
  const month = monthlyOffer(locale);
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-accent/25 bg-accent/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {offer && (
          <span className="mb-1.5 inline-block rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            {offerBadge}
          </span>
        )}
        <p className="text-sm font-semibold text-text-base">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{desc}</p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <LaunchPrice locale={locale} suffix={perMonth} fromLabel={offerFrom} size="sm" />
        {offer && month && (
          <p className="text-[11px] font-semibold text-accent">
            {(month.daysLeft <= 1 ? offerLastDay : offerDaysLeft.replace("{n}", String(month.daysLeft))).replace("{name}", month.name)}
          </p>
        )}
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
