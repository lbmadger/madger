import {
  LAUNCH_OFFER,
  launchOfferActive,
  launchOfferRegularFromLabel,
} from "@/lib/subscription/offer";

// Prix du Pro pendant l'offre de lancement : le prix payé en grand, le
// tarif à venir barré en rouge juste à côté, et sa date d'application en
// dessous. Hors offre : le prix seul. Sans hook : utilisable côté serveur.
export default function LaunchPrice({
  period = "monthly",
  locale,
  suffix,
  fromLabel,
  size = "md",
  className = "",
}: {
  period?: "monthly" | "annual";
  locale: string;
  // « / mois » ou « / an », déjà traduit.
  suffix: string;
  // « Tarif à partir du {date} », déjà traduit, avec {date}.
  fromLabel: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const offer = launchOfferActive();
  const fmt = (c: number) =>
    (c / 100).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
  const paid =
    period === "annual" ? LAUNCH_OFFER.launchAnnualCents : LAUNCH_OFFER.launchMonthlyCents;
  const regular =
    period === "annual" ? LAUNCH_OFFER.regularAnnualCents : LAUNCH_OFFER.regularMonthlyCents;

  const big =
    size === "lg"
      ? "text-4xl sm:text-5xl"
      : size === "sm"
      ? "text-2xl"
      : "text-3xl";
  const strike =
    size === "lg" ? "text-xl sm:text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-0">
        <span className={`font-display font-extrabold leading-none tracking-tight text-text-base ${big}`}>
          {fmt(paid)}
        </span>
        {offer && (
          <span
            className={`relative mb-0.5 font-bold leading-none text-red-500 ${strike}`}
            aria-label={`${fromLabel.replace("{date}", launchOfferRegularFromLabel(locale))} : ${fmt(regular)}`}
          >
            <span aria-hidden="true" className="line-through decoration-red-500 decoration-2">
              {fmt(regular)}
            </span>
          </span>
        )}
        <span className="mb-0.5 text-sm text-text-muted">{suffix}</span>
      </div>
      {offer && (
        <p className="mt-1 text-[11px] leading-snug text-text-dim">
          <span className="text-red-400">{fmt(regular)}</span>{" "}
          {fromLabel.replace("{date}", launchOfferRegularFromLabel(locale))}
        </p>
      )}
    </div>
  );
}
