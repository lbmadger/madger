"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startRouteProgress } from "@/components/ui/RouteProgress";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { PASSWORD_RULES, isPasswordStrong } from "@/lib/utils/password";
import Button from "@/components/ui/Button";
import { inputClass } from "@/lib/ui/styles";
import { LAUNCH_LINK, LAUNCH_OFFER, launchLinkActive, launchLinkMonthlyCents, launchLinkUntilLabel, euros } from "@/lib/subscription/offer";

type Mode = "login" | "signup";

// Formulaire d'auth login/signup. Compte = email + mot de passe (uniquement).
// À l'inscription, vérification par lien de confirmation envoyé par email.
// Google en option.

export default function AuthForm({ mode }: { mode: Mode }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Rôle du compte créé : 'client' si ?role=client (parcours client après
  // réservation), sinon 'coach' (espace coach par défaut).
  const role = searchParams.get("role") === "client" ? "client" : "coach";
  // Client : direction le profil sportif (3 étapes) après inscription — sauf
  // destination explicite (ex. retour sur la page d'un coach pour le contacter).
  // Seuls les chemins INTERNES sont acceptés ("/..." mais pas "//evil.com") :
  // sinon un lien madger.app/login?redirect=https://piege.fr servirait de
  // tremplin de phishing après connexion.
  const fallback = role === "client" ? "/onboarding-client" : "/dashboard";
  const rawRedirect = searchParams.get("redirect") || fallback;
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : fallback;

  const isSignup = mode === "signup";
  // Un client arrive aussi par sa destination (« Mes séances », profil,
  // messages) sans ?role=client : mêmes titres dédiés.
  const clientFlow =
    role === "client" ||
    ["/espace", "/onboarding-client", "/messages"].some(
      (p) => redirectTo === p || redirectTo.startsWith(p + "/") || redirectTo.startsWith(p + "?")
    );

  // Déjà connecté : un coach qui retombe sur l'inscription ou la connexion
  // (lien « Crée ta page » de l'annuaire, favori) part droit sur son
  // dashboard ; un client déjà connecté sur un parcours client rejoint sa
  // destination. Sinon le formulaire s'affichait et ne menait nulle part.
  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user || !alive) return;
      const { data: coachRow } = await supabase
        .from("coaches")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      if (coachRow) router.replace("/dashboard");
      else if (clientFlow) router.replace(redirectTo);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parrainage : un lien /signup?ref=CODE mémorise le code localement. Il
  // survit au détour Google (même origine) et sera rattaché au compte à la
  // fin de l'onboarding coach.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && role === "coach") {
      try {
        localStorage.setItem("madger_ref", ref.trim().toUpperCase());
      } catch {
        /* stockage indisponible */
      }
    }
  }, [searchParams, role]);

  // Offre de lancement : /signup?offre=LANCEMENT (via madger.app/lancement)
  // mémorise le code, rattaché au compte à la fin de l'onboarding coach.
  const offerParam = (searchParams.get("offre") ?? "").trim().toUpperCase();
  // Source d'acquisition (?src=grindars, lancement, fb-groupe…) : mémorisée,
  // posée sur le compte à la fin de l'onboarding pour mesurer les canaux.
  const srcParam = (searchParams.get("src") ?? "").trim().toLowerCase().slice(0, 40);
  useEffect(() => {
    if (!srcParam || role !== "coach") return;
    try {
      localStorage.setItem("madger_src", srcParam);
    } catch {
      /* stockage indisponible */
    }
  }, [srcParam, role]);
  const [launchOffer, setLaunchOffer] = useState(false);
  useEffect(() => {
    if (role !== "coach" || !launchLinkActive()) return;
    try {
      if (offerParam === LAUNCH_LINK.code) {
        localStorage.setItem("madger_offer", LAUNCH_LINK.code);
        setLaunchOffer(true);
      } else if (isSignup && localStorage.getItem("madger_offer") === LAUNCH_LINK.code) {
        setLaunchOffer(true);
      }
    } catch {
      /* stockage indisponible */
    }
  }, [offerParam, role, isSignup]);

  // Préremplissage depuis la simulation de la landing (?email=, ?prenom=,
  // ?nom=, ?tel=) : le coach ne ressaisit pas ce qu'il vient de donner. Les
  // noms et le téléphone partent dans les métadonnées du compte, lues par
  // l'onboarding (nameFromMetadata).
  const prefill = {
    email: isSignup ? (searchParams.get("email") ?? "").trim().slice(0, 254) : "",
    firstName: (searchParams.get("prenom") ?? "").trim().slice(0, 60),
    lastName: (searchParams.get("nom") ?? "").trim().slice(0, 80),
    phone: (searchParams.get("tel") ?? "").trim().slice(0, 25),
  };
  const [email, setEmail] = useState(prefill.email);
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configOk = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configOk) return setError("Configuration Supabase manquante.");
    if (isSignup && !isPasswordStrong(password))
      return setError(t("auth.errors.passwordWeak"));

    setLoading(true);
    try {
      const supabase = createClient();
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              ...(prefill.firstName ? { first_name: prefill.firstName } : {}),
              ...(prefill.lastName ? { last_name: prefill.lastName } : {}),
              ...(prefill.phone ? { phone: prefill.phone } : {}),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) {
          // Le cas n°1 en vrai : l'email a déjà un compte. Le dire, sinon
          // l'utilisateur boucle sur « une erreur est survenue ».
          const msg = (error.message ?? "").toLowerCase();
          return setError(
            msg.includes("already registered") || msg.includes("already exists")
              ? t("auth.errors.emailTaken")
              : t("auth.errors.generic")
          );
        }
        // Compte déjà existant avec confirmation email active : Supabase
        // « réussit » sans créer d'identité (anti-énumération). Sans ce
        // test, on afficherait « vérifie ta boîte mail » et rien n'arrive.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          return setError(t("auth.errors.emailTaken"));
        }
        // Confirmation email active → pas de session immédiate : on invite à
        // vérifier la boîte mail. Sinon, on entre directement.
        if (data.session) {
          startRouteProgress();
          router.push(redirectTo);
          router.refresh();
        } else {
          setEmailSent(true);
        }
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return setError(t("auth.errors.invalidCredentials"));
      // Le dashboard est rendu côté serveur : sans ce signal, le bouton reste
      // muet pendant toute la requête (pas de <a> cliqué à intercepter).
      startRouteProgress();
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    if (!configOk) return setError("Configuration Supabase manquante.");
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}&as=${role}`,
        },
      });
      if (error) {
        setError(t("auth.errors.generic"));
        setGoogleLoading(false);
      }
      // Succès : la page part vers Google, on laisse l'état « chargement ».
    } catch {
      setError(t("auth.errors.generic"));
      setGoogleLoading(false);
    }
  }

  // ?google=1 (bouton « Continuer avec Google » du résultat de la
  // simulation) : la page part vers Google sans clic supplémentaire.
  const autoGoogleRef = useRef(false);
  useEffect(() => {
    if (!isSignup || autoGoogleRef.current) return;
    if (searchParams.get("google") !== "1") return;
    autoGoogleRef.current = true;
    handleGoogle();
    // handleGoogle est stable au sens de l'usage (une seule fois au montage).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignup, searchParams]);

  // État "vérifie ta boîte mail" (lien de confirmation envoyé).
  if (emailSent) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-base">
          {t("auth.signup.checkEmailTitle")}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          {t("auth.signup.checkEmailDesc")}
        </p>
      </div>
    );
  }

  const titleKey = isSignup ? "auth.signup" : "auth.login";
  // Parcours client (?role=client) : titres dédiés, pas « compte coach ».
  const title = clientFlow
    ? t(`${titleKey}.clientTitle`)
    : t(`${titleKey}.title`);
  const subtitle = clientFlow
    ? t(`${titleKey}.clientSubtitle`)
    : t(`${titleKey}.subtitle`);

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-text-base">
        {title}
      </h1>
      <p className="mt-1 text-sm text-text-muted">{subtitle}</p>

      {/* Offre de lancement arrivée par le lien : ce que le compte débloque,
          et jusqu'à quand le lien vaut. */}
      {launchOffer && !clientFlow && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-sm leading-relaxed text-text-base">
          <p className="font-semibold text-accent">{t("auth.signup.launchOfferTitle")}</p>
          <p className="mt-0.5">
            {t("auth.signup.launchOfferDesc")
              .replace("{price}", euros(launchLinkMonthlyCents(), locale))
              .replace("{months}", String(LAUNCH_LINK.months))
              .replace("{full}", euros(LAUNCH_OFFER.launchMonthlyCents, locale))
              .replace("{date}", launchLinkUntilLabel(locale))}
          </p>
        </div>
      )}

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border-strong bg-bg-elevated px-4 py-3 text-sm font-medium text-text-base transition-all hover:border-white/20 hover:bg-bg-card active:scale-95 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        {googleLoading ? t("common.loading") : t("auth.googleContinue")}
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase text-text-dim">{t("auth.or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            {t("auth.emailLabel")}
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            {t("auth.passwordLabel")}
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={inputClass}
          />
        </label>

        {!isSignup && (
          <Link
            href={`/forgot-password${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
            className="-mt-1 self-end text-xs text-text-muted transition-colors hover:text-accent"
          >
            {t("auth.forgot.link")}
          </Link>
        )}

        {isSignup && (
          <ul className="-mt-1 flex flex-col gap-1.5">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <li
                  key={rule.key}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    ok ? "text-accent" : "text-text-dim"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    {ok ? <path d="M20 6L9 17l-5-5" /> : <circle cx="12" cy="12" r="9" strokeWidth="1.6" />}
                  </svg>
                  {t(rule.labelKey)}
                </li>
              );
            })}
          </ul>
        )}

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading
            ? isSignup
              ? t("auth.signingUp")
              : t("auth.signingIn")
            : t(`${titleKey}.submit`)}
        </Button>
      </form>

      {isSignup && (
        <p className="mt-3 text-center text-xs text-text-dim">
          {t("auth.signup.termsPrefix")}{" "}
          <Link href="/cgu" className="underline hover:text-accent" target="_blank">
            {t("auth.signup.termsCgu")}
          </Link>{" "}
          {t("auth.signup.termsAnd")}{" "}
          <Link
            href="/politique-de-confidentialite"
            className="underline hover:text-accent"
            target="_blank"
          >
            {t("auth.signup.termsPrivacy")}
          </Link>
          .
        </p>
      )}

      {/* Bascule login/signup : la query string (role=client, redirect,
          book, slot) est conservée, sinon un client en plein tunnel de
          réservation créerait un compte coach et perdrait sa destination. */}
      <p className="mt-5 text-center text-sm text-text-muted">
        {isSignup ? t("auth.signup.haveAccount") : t("auth.login.noAccount")}{" "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
          className="font-medium text-accent hover:underline"
        >
          {isSignup ? t("auth.signup.link") : t("auth.login.link")}
        </Link>
      </p>
    </div>
  );
}
