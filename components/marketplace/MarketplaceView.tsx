"use client";

import { useState, useEffect, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import CityAutocomplete from "@/components/ui/CityAutocomplete";
import Stars from "@/components/reviews/Stars";
import { geocodeCity, type City } from "@/lib/geo/cities";
import { SPORT_KEYS, SPECIALTY_KEYS } from "@/lib/coaches/taxonomy";
import { interactiveCardClass } from "@/lib/ui/styles";
import {
  type PublicCoach,
  coachFullName,
  coachInitials,
  isSuperCoach,
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
  const [sportFilter, setSportFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [radiusKm, setRadiusKm] = useState(0); // 0 = ville exacte
  const [showFilters, setShowFilters] = useState(false);
  const [coaches, setCoaches] = useState<PublicCoach[]>(initialCoaches);
  const [loading, setLoading] = useState(false);
  // Bandeau rayon : soit choisi par l'utilisateur, soit élargi automatiquement.
  const [radius, setRadius] = useState<{
    city: string;
    km: number;
    chosen: boolean;
  } | null>(null);

  // Panneau de filtres ouvert par défaut sur grand écran.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setShowFilters(true);
  }, []);

  async function runSearch(
    cityArg = query,
    coordsArg = coords,
    radiusArg = radiusKm
  ) {
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

      // Rayon choisi par l'utilisateur → coachs de la ville + du périmètre.
      // La recherche par distance se fait CÔTÉ BASE (RPC indexée) : elle
      // reste juste et rapide quel que soit le nombre de coachs.
      if (radiusArg > 0) {
        const target = coordsArg ?? (await geocodeCity(city));
        const { data: exact } = await base()
          .ilike("city", `%${city}%`)
          .limit(50);
        const list = ((exact ?? []) as PublicCoach[]).slice();
        if (target) {
          const { data: near } = await supabase.rpc("search_coaches_nearby", {
            p_lat: target.lat,
            p_lng: target.lng,
            p_radius_km: radiusArg,
            p_online_only: filter === "online",
          });
          const seen = new Set(list.map((c) => c.id));
          for (const c of (near ?? []) as PublicCoach[]) {
            if (!seen.has(c.id)) list.push(c);
          }
        }
        setCoaches(list);
        setRadius({ city, km: radiusArg, chosen: true });
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

      // 2) Élargissement automatique : il faut les coordonnées de la ville.
      const target = coordsArg ?? (await geocodeCity(city));
      if (target) {
        const { data: near } = await supabase.rpc("search_coaches_nearby", {
          p_lat: target.lat,
          p_lng: target.lng,
          p_radius_km: RADIUS_KM,
          p_online_only: filter === "online",
        });
        setCoaches(((near ?? []) as PublicCoach[]));
        setRadius({ city, km: RADIUS_KM, chosen: false });
        return;
      }

      // Aucune coordonnée → aucun résultat.
      setCoaches([]);
      setRadius({ city, km: RADIUS_KM, chosen: false });
    } finally {
      setLoading(false);
    }
  }

  // Remise à zéro de tous les filtres.
  function clearFilters() {
    setQuery("");
    setCoords(null);
    setSportFilter("");
    setSpecialtyFilter("");
    setFilter("all");
    setRadiusKm(0);
    runSearch("", null, 0);
  }

  const activeCount =
    (query.trim() ? 1 : 0) +
    (radiusKm > 0 ? 1 : 0) +
    (sportFilter ? 1 : 0) +
    (specialtyFilter ? 1 : 0) +
    (filter === "online" ? 1 : 0);

  // Relance quand on change de filtre (Tout / En ligne).
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch();
  }

  // Filtres sport / accompagnement appliqués côté client sur les résultats.
  const shown = coaches.filter(
    (c) =>
      (!sportFilter || c.sport === sportFilter) &&
      (!specialtyFilter || (c.specialties ?? []).includes(specialtyFilter))
  );

  return (
    <main className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      {/* Halo lumineux d'ambiance derrière le hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-220px] h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.06] px-3.5 py-1.5 text-xs font-medium text-accent">
          <span className="glow-dot h-1.5 w-1.5 rounded-full bg-accent" />
          {t("marketplace.heroBadge")}
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-text-base sm:text-5xl">
          {t("marketplace.titleA")}{" "}
          <span className="text-shimmer">{t("marketplace.titleB")}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted sm:text-base">
          {t("marketplace.heroSubtitle")}
        </p>
      </motion.div>

      {/* Barre : ouvrir les filtres + tout effacer */}
      <div className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            showFilters || activeCount > 0
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-strong text-text-muted hover:text-text-base"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          {t("marketplace.filtersBtn")}
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-black">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-red-400/50 hover:text-red-400"
          >
            ✕ {t("marketplace.clearFilters")}
          </button>
        )}
      </div>

      {/* Panneau de filtres : ville, rayon, mode, sport, objectif */}
      {showFilters && (
        <form
          onSubmit={onSubmit}
          className="mx-auto mt-3 flex max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-bg-card p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
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
              inputClassName="w-full rounded-full border border-border-strong bg-white/[0.03] px-4 py-2.5 text-base text-text-base outline-none transition-colors placeholder:text-text-dim focus:border-accent"
            />
            {/* Périmètre autour de la ville */}
            <select
              value={radiusKm}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRadiusKm(v);
                if (query.trim()) runSearch(query, coords, v);
              }}
              disabled={!query.trim()}
              className={`rounded-full border px-3 py-2.5 text-sm font-medium outline-none transition-colors disabled:opacity-40 ${
                radiusKm > 0
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border-strong bg-transparent text-text-muted"
              }`}
            >
              <option value={0}>{t("marketplace.exactCity")}</option>
              {[10, 20, 30, 50].map((km) => (
                <option key={km} value={km}>
                  + {km} {t("marketplace.km")}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={loading} className="px-6 py-2.5">
              {t("marketplace.search")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors ${
                sportFilter
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border-strong bg-transparent text-text-muted"
              }`}
            >
              <option value="">{t("marketplace.filterSport")}</option>
              {SPORT_KEYS.map((s) => (
                <option key={s} value={s}>
                  {t(`taxonomy.sports.${s}`)}
                </option>
              ))}
            </select>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors ${
                specialtyFilter
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border-strong bg-transparent text-text-muted"
              }`}
            >
              <option value="">{t("marketplace.filterGoal")}</option>
              {SPECIALTY_KEYS.map((s) => (
                <option key={s} value={s}>
                  {t(`clientOnboarding.goals.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </form>
      )}

      {/* Bandeau rayon : choisi par l'utilisateur ou élargi automatiquement */}
      {radius && shown.length > 0 && (
        <p className="mx-auto mt-6 max-w-xl rounded-xl border border-accent/20 bg-accent/[0.05] px-4 py-2.5 text-center text-sm text-text-muted">
          {radius.chosen ? (
            <>
              {t("marketplace.aroundA")}{" "}
              <span className="font-medium text-text-base">{radius.city}</span>{" "}
              ({radius.km} {t("marketplace.km")})
            </>
          ) : (
            <>
              {t("marketplace.radiusA")}{" "}
              <span className="font-medium text-text-base">{radius.city}</span>
              {t("marketplace.radiusB")} {radius.km} {t("marketplace.km")}.
            </>
          )}
        </p>
      )}

      {/* Résultats */}
      <div className="mt-8">
        {shown.length === 0 ? (
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
                {shown.length}
              </span>{" "}
              {shown.length === 1
                ? t("marketplace.resultsOne")
                : t("marketplace.resultsMany")}
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((c, i) => (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(i * 0.05, 0.45),
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                >
                  <Link
                    href={`/${c.slug}`}
                    className={`flex h-full flex-col gap-3 p-4 ${interactiveCardClass}`}
                  >
                    <div className="flex items-center gap-3">
                      {c.avatar_url ? (
                        <Image
                          src={c.avatar_url}
                          alt=""
                          width={48}
                          height={48}
                          className="h-12 w-12 shrink-0 rounded-full border border-border-strong object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-base font-semibold text-accent">
                          {coachInitials(c)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-text-base">
                          {coachFullName(c)}
                        </span>
                        {c.specialty && (
                          <span className="block truncate text-xs text-text-muted">
                            {c.specialty}
                          </span>
                        )}
                        {c.rating_avg != null && c.rating_count > 0 && (
                          <span className="mt-0.5 flex items-center gap-1">
                            <Stars value={Number(c.rating_avg)} size={11} />
                            <span className="text-[11px] text-text-dim">
                              {Number(c.rating_avg)} ({c.rating_count})
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5">
                      {isSuperCoach(c) && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-black">
                          🏆 {t("marketplace.superCoach")}
                        </span>
                      )}
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
                </motion.li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
