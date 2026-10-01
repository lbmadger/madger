import { currentMonthlyCents, currentAnnualCents } from "@/lib/subscription/offer";

// Prix du Pro (mensuel ou annuel) avec son suffixe. Sans hook : utilisable
// côté serveur. Le montant vient de lib/subscription/offer.ts, jamais en dur.
export default function LaunchPrice({
  period = "monthly",
  locale,
  suffix,
  size = "md",
  className = "",
}: {
  period?: "monthly" | "annual";
  locale: string;
  // « / mois » ou « / an », déjà traduit.
  suffix: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const fmt = (c: number) =>
    (c / 100).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
  const paid = period === "annual" ? currentAnnualCents() : currentMonthlyCents();

  const big =
    size === "lg"
      ? "text-4xl sm:text-5xl"
      : size === "sm"
      ? "text-2xl"
      : "text-3xl";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-0">
        <span className={`font-display font-extrabold leading-none tracking-tight text-text-base ${big}`}>
          {fmt(paid)}
        </span>
        <span className="mb-0.5 text-sm text-text-muted">{suffix}</span>
      </div>
    </div>
  );
}
