"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { interactiveCardClass } from "@/lib/ui/styles";
import {
  type PublicCoach,
  coachFullName,
  coachInitials,
} from "@/lib/coaches/public-types";

type Filter = "all" | "online";

export default function MarketplaceView({
  initialCoaches,
}: {
  initialCoaches: PublicCoach[];
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [coaches, setCoaches] = useState<PublicCoach[]>(initialCoaches);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let q = supabase.from("public_coaches").select("*");
      if (filter === "online") q = q.eq("accepts_online", true);
      const city = query.trim();
      if (city) q = q.ilike("city", `%${city}%`);
      const { data } = await q
        .order("created_at", { ascending: false })
        .limit(50);
      setCoaches((data ?? []) as PublicCoach[]);
    } finally {
      setLoading(false);
    }
  }, [filter, query]);

  // Relance la recherche quand on change de filtre (Tout / En ligne).
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
      {/* Titre */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-base sm:text-4xl">
          {t("marketplace.title")}
        </h1>
        <p className="mt-2 text-sm text-text-muted sm:text-base">
          {t("marketplace.subtitle")}
        </p>
      </div>

      {/* Barre de recherche */}
      <form
        onSubmit={onSubmit}
        className="mx-auto mt-6 flex max-w-xl flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-dim"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("marketplace.cityPlaceholder")}
            className="w-full rounded-full border border-border-strong bg-white/[0.03] py-3 pl-11 pr-4 text-base text-text-base outline-none transition-colors placeholder:text-text-dim focus:border-accent"
          />
        </div>
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

      {/* Résultats */}
      <div className="mt-8">
        {coaches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
            <h3 className="text-base font-semibold text-text-base">
              {t("marketplace.emptyTitle")}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              {t("marketplace.emptyDesc")}
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
