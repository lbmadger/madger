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
type Me = { firstName: string; avatarUrl: string | null };

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
      const [{ data: prof }, { data: cp }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("client_profiles")
          .select("first_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
      ]);
      // Seuls les clients ont cloche et profil ici : un coach a son dashboard.
      if (!alive || prof?.role === "coach") return;
      const first =
        (cp?.first_name as string | null) ||
        (user.user_metadata?.first_name as string | undefined) ||
        (user.email ?? "").split("@")[0] ||
        "";
      setMe({ firstName: first, avatarUrl: (cp?.avatar_url as string | null) ?? null });
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
          <Link
            href="/espace"
            className="rounded-full border border-border-strong px-3.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:border-accent hover:text-text-base"
          >
            {t("clientSpace.title")}
          </Link>
          {me && (
            <>
              <ClientBell />
              <Link
                href="/onboarding-client"
                aria-label={t("clientSpace.myProfile")}
                title={t("clientSpace.myProfile")}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-bg-card transition-colors hover:border-accent"
              >
                {me.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-text-muted">
                    {(me.firstName[0] ?? "?").toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
