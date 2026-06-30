"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import CityAutocomplete from "@/components/ui/CityAutocomplete";
import { geocodeCity, distanceKm, type City } from "@/lib/geo/cities";
import { interactiveCardClass } from "@/lib/ui/styles";
import {
  type PublicCoach,
  coachFullName,
  coachInitials,
} from "@/lib/coaches/public-types";

type Filter = "all" | "online";
type Coords = { lat: number; lng: number };
// Rayon élargi quand aucun coach n'est trouvé dans la ville exacte.
const RADIUS_KM = 30;

export default function MarketplaceView({
  initialCoaches,
}: {
  initialCoaches: PublicCoach[];
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [coaches, setCoaches] = useState<PublicCoach[]>(initialCoaches);
  const [loading, setLoading] = useState(false);
  // Mémorise qu'on a basculé en recherche par rayon (pour le bandeau / message).
  const [radius, setRadius] = useState<{ city: string; km: number } | null>(
    null
  );

  async function runSearch(cityArg = query, coordsArg = coords) {
    setLoading(true);
    setRadius(null);
    try {
      const supabase = createClient();
      const base = () => {
        const q = supabase.from("public_coaches").select("*");
        return filter === "online" ? q.eq("accepts_online", true) : q;
      };

      const city = cityArg.trim();

      // Pas de ville → tous les coachs (récents d'abord).
      if (!city) {
        const { data } = await base()
          .order("created_at", { ascending: false })
          .limit(50);
        setCoaches((data ?? []) as PublicCoach[]);
        return;
      }

      // 1) Correspondance exacte sur la ville.
      const { data: exact } = await base()
        .ilike("city", `%${city}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if ((exact ?? []).length > 0) {
        setCoaches(exact as PublicCoach[]);
        return;
      }

      // 2) Élargissement par rayon : il faut les coordonnées de la ville.
      const target = coordsArg ?? (await geocodeCity(city));
      if (target) {
        const { data: all } = await base().not("lat", "is", null).limit(500);
        const within = ((all ?? []) as PublicCoach[])
          .map((c) => ({
            c,
            d: distanceKm(target, { lat: c.lat!, lng: c.lng! }),
          }))
          .filter((x) => x.d <= RADIUS_KM)
          .sort((a, b) => a.d - b.d)
          .map((x) => x.c);
        setCoaches(within);
        setRadius({ city, km: RADIUS_KM });
        return;
      }

      // Aucune coordonnée → aucun résultat.
      setCoaches([]);
      setRadius({ city, km: RADIUS_KM });
    } finally {
      setLoading(false);
    }
  }

  // Relance quand on change de filtre (Tout / En ligne).
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-base sm:text-4xl">
          {t("marketplace.title")}
        </h1>
        <p className="mt-2 text-sm text-text-muted sm:text-base">
          {t("marketplace.subtitle")}
        </p>
      </div>

      {/* Recherche ville (autocomplétion communes FR) */}
      <form
        onSubmit={onSubmit}
        className="mx-auto mt-6 flex max-w-xl flex-col gap-2 sm:flex-row"
      >
        <CityAutocomplete
          value={query}
          onChange={(v) => {
            setQuery(v);
            setCoords(null);
          }}
          onSelect={(c: City) => {
            setQuery(c.name);
            setCoords({ lat: c.lat, lng: c.lng });
            runSearch(c.name, { lat: c.lat, lng: c.lng });
          }}
          placeholder={t("marketplace.cityPlaceholder")}
          className="flex-1"
          inputClassName="w-full rounded-full border border-border-strong bg-white/[0.03] px-4 py-3 text-base text-text-base outline-none transition-colors placeholder:text-text-dim focus:border-accent"
        />
        <Button type="submit" disabled={loading} className="sm:px-7">
          {t("marketplace.search")}
        </Button>
      </form>

      {/* Filtres */}
      <div className="mx-auto mt-4 flex max-w-xl justify-center gap-2">
        {(["all", "online"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "border-accent bg-accent/10 text-accent"
                : "border-border-strong text-text-muted hover:text-text-base"
            }`}
          >
            {f === "all"
              ? t("marketplace.filterAll")
              : t("marketplace.filterOnline")}
          </button>
        ))}
      </div>

      {/* Bandeau "rayon élargi" */}
      {radius && coaches.length > 0 && (
        <p className="mx-auto mt-6 max-w-xl rounded-xl border border-accent/20 bg-accent/[0.05] px-4 py-2.5 text-center text-sm text-text-muted">
          {t("marketplace.radiusA")}{" "}
          <span className="font-medium text-text-base">{radius.city}</span>
          {t("marketplace.radiusB")} {radius.km} {t("marketplace.km")}.
        </p>
      )}

      {/* Résultats */}
      <div className="mt-8">
        {coaches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
            <h3 className="text-base font-semibold text-text-base">
              {t("marketplace.emptyTitle")}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              {radius ? t("marketplace.emptyRadiusDesc") : t("marketplace.emptyDesc")}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-text-muted">
              <span className="font-semibold text-text-base">
                {coaches.length}
              </span>{" "}
              {coaches.length === 1
                ? t("marketplace.resultsOne")
                : t("marketplace.resultsMany")}
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {coaches.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/${c.slug}`}
                    className={`flex h-full flex-col gap-3 p-4 ${interactiveCardClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-base font-semibold text-accent">
                        {coachInitials(c)}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-text-base">
                          {coachFullName(c)}
                        </span>
                        {c.specialty && (
                          <span className="block truncate text-xs text-text-muted">
                            {c.specialty}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5">
                      {c.city && (
                        <span className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] text-text-muted">
                          {c.city}
                        </span>
                      )}
                      {c.accepts_online && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                          {t("marketplace.onlineBadge")}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
