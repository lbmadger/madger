"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Petite barre affichée en haut de l'onboarding (coach et client) : rappelle
// avec QUEL compte on est connecté et offre un « Changer de compte ». Utile
// quand on se connecte avec le mauvais compte Google avant d'avoir rempli
// quoi que ce soit : on peut se déconnecter et repartir du bon compte.
export default function AccountSwitchBar() {
  const { t } = useI18n();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => {});
  }, []);

  if (!email) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-bg-card/60 px-4 py-2.5">
      <span className="min-w-0 text-xs text-text-muted">
        {t("account.loggedInAs")}{" "}
        <span className="font-medium text-text-base">{email}</span>
      </span>
      <form action="/auth/signout" method="post" className="shrink-0">
        <button
          type="submit"
          className="text-xs font-medium text-text-dim underline transition-colors hover:text-accent"
        >
          {t("account.switchAccount")}
        </button>
      </form>
    </div>
  );
}
