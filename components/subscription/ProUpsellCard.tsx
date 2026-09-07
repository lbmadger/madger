import Link from "next/link";
import {
  launchOfferActive,
  launchOfferUntilLabel,
  LAUNCH_OFFER,
} from "@/lib/subscription/offer";

// Carte Pro compacte, glissée dans les pages du dashboard quand le coach est
// en Gratuit (Paiements, Statistiques, Factures). Rendue côté serveur :
// les textes arrivent déjà traduits par la page.
export default function ProUpsellCard({
  title,
  desc,
  cta,
  locale,
  offerLine,
  offerKeep,
  offerBadge,
  className = "",
}: {
  title: string;
  desc: string;
  cta: string;
  locale: string;
  offerLine: string; // avec {regular} et {date}
  offerKeep: string;
  offerBadge: string;
  className?: string;
}) {
  const offer = launchOfferActive();
  const euros = (c: number) =>
    (c / 100).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {offer && (
          <span className="mb-1.5 inline-block rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            {offerBadge}
          </span>
        )}
        <p className="text-sm font-semibold text-text-base">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
          {desc}
          {offer
            ? ` ${offerLine
                .replace("{regular}", euros(LAUNCH_OFFER.regularMonthlyCents))
                .replace("{date}", launchOfferUntilLabel(locale))} ${offerKeep}`
            : ""}
        </p>
      </div>
      <Link
        href="/dashboard/abonnement"
        className="shrink-0 rounded-full bg-accent px-4 py-2 text-center text-xs font-semibold text-black transition-opacity hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}
