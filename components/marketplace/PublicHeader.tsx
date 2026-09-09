"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import MadgerLogo from "@/components/ui/MadgerLogo";
import ClientBell from "@/components/client/ClientBell";

// En-tête léger des pages publiques de la marketplace. Le choix de la langue
// vit dans les réglages, pas ici. Un client connecté y retrouve sa cloche et
// sa photo (vers son profil) à côté de « Mes séances ».
type Me = { firstName: string; lastName: string; avatarUrl: string | null; isCoach: boolean };

export default function PublicHeader() {
  const { t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      // Tout compte connecté a sa cloche et son profil ici (un coach peut
      // aussi réserver chez un autre coach avec le même compte).
      const [{ data: cp }, { data: coachRow }] = await Promise.all([
        supabase
          .from("client_profiles")
          .select("first_name, last_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        // Aussi coach ? (RLS : seule sa propre ligne est lisible.)
        supabase.from("coaches").select("id").eq("id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
      const first =
        (cp?.first_name as string | null) ||
        meta.first_name ||
        (meta.full_name ?? "").split(" ")[0] ||
        (user.email ?? "").split("@")[0] ||
        "";
      const last =
        (cp?.last_name as string | null) ||
        meta.last_name ||
        (meta.full_name ?? "").split(" ").slice(1).join(" ") ||
        "";
      setMe({
        firstName: first,
        lastName: last,
        avatarUrl: (cp?.avatar_url as string | null) ?? null,
        isCoach: !!coachRow,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/coachs" className="flex items-center gap-2.5">
          <MadgerLogo size={28} />
          <span className="text-lg font-extrabold tracking-tight text-text-base">
            Madger
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/blog"
            className="hidden rounded-full px-3.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-base sm:inline-block"
          >
            Blog
          </Link>
          {/* Sur téléphone, connecté : la cloche et la photo suffisent, le
              lien « Mes séances » ne tient pas à côté. */}
          <Link
            href="/espace"
            className={`whitespace-nowrap rounded-full border border-border-strong px-3.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-accent hover:text-text-base ${me ? "hidden sm:inline-block" : ""}`}
          >
            {t("clientSpace.title")}
          </Link>
          {me && (
            <>
              {me.isCoach && (
                // Même compte côté coach : retour au dashboard sans reconnexion.
                <Link
                  href="/dashboard"
                  title={t("clientSpace.coachView")}
                  aria-label={t("clientSpace.coachView")}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-accent/40 bg-accent/[0.06] px-2.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 sm:px-3.5"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  <span className="sm:hidden">{t("clientSpace.coachViewShort")}</span>
                  <span className="hidden sm:inline">{t("clientSpace.coachView")}</span>
                </Link>
              )}
              <ClientBell />
              {/* Photo + nom du client : un clic ouvre son profil. */}
              <Link
                href="/onboarding-client"
                title={t("clientSpace.myProfile")}
                className="flex items-center gap-2 rounded-full border border-border-strong bg-bg-card p-1 transition-colors hover:border-accent sm:pr-3"
              >
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-bg-elevated">
                  {me.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-text-muted">
                      {(me.firstName[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="hidden max-w-[160px] truncate text-sm font-medium text-text-base sm:inline">
                  {[me.firstName, me.lastName].filter(Boolean).join(" ") || t("clientSpace.myProfile")}
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
