"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MadgerLogo from "@/components/ui/MadgerLogo";
import { track } from "@/lib/analytics/posthog";
import { useEarlyAccessFull } from "@/components/ui/useEarlyAccessFull";
import { FEE_RATE_BPS } from "@/lib/subscription/plan";
import { currentMonthlyCents } from "@/lib/subscription/offer";

// Accès anticipé en trois temps (parcours de capture progressif) :
//   0. le coach pose SES chiffres (séances par semaine, prix d'une séance) et
//      voit tout de suite ce que ça représente et ce que Madger lui coûte ;
//   1. prénom, nom, email ;
//   2. téléphone, puis envoi.
// L'API /api/early-access et la table early_access ne changent pas : les
// champs historiques (type de coaching, volume, défi) sont remplis depuis les
// chiffres saisis à l'étape 0.

const inputBase = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium" style={{ color: "#8A8A8A" }}>
      {children}
    </span>
  );
}

function Required() {
  return <span style={{ color: "#ef4444" }}> *</span>;
}

function focusOn(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "#CBFF03";
}
function focusOff(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "rgba(255,255,255,0.12)";
}

// text-base (16px) sur mobile : en dessous de 16px, iOS Safari zoome
// automatiquement la page au focus d'un champ. sm:text-sm garde 14px sur desktop.
const cls = "w-full px-5 py-3.5 rounded-xl text-white text-base sm:text-sm outline-none";

const WEEKS_PER_MONTH = 4.33;
const eur = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const STEP_LABELS = ["Tes chiffres", "Toi", "Ton numéro"];

export default function EarlyAccessForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  // Bloc de confirmation : le focus y est déplacé après l'envoi pour que les
  // lecteurs d'écran annoncent immédiatement le succès.
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (submitted) confirmRef.current?.focus();
  }, [submitted]);

  // État "complet" partagé avec le hero (aucun nombre exposé).
  const full = useEarlyAccessFull();
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  // Adresse déjà inscrite : on le dit franchement au lieu d'un faux succès.
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // Étape 0 : les chiffres du coach.
  const [sessionsWeek, setSessionsWeek] = useState(10);
  const [price, setPrice] = useState(50);
  const monthlySessions = Math.round(sessionsWeek * WEEKS_PER_MONTH);
  const revenue = monthlySessions * price;
  const essentialRate = FEE_RATE_BPS.essential / 10000;
  const proRate = FEE_RATE_BPS.pro / 10000;
  const proMonthly = currentMonthlyCents() / 100;
  const essentialCost = revenue * essentialRate;
  const proCost = proMonthly + revenue * proRate;
  const breakeven = proMonthly / (essentialRate - proRate);
  const proCheaper = proCost < essentialCost;

  const [fields, setFields] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    // Honeypot anti-spam : invisible pour les humains, les bots le remplissent.
    website: "",
  });

  function set(k: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [k]: e.target.value }));
  }

  function scrollToForm() {
    window.scrollTo({ top: document.getElementById("early-access")?.offsetTop ?? 0, behavior: "smooth" });
  }

  function handleCalcContinue() {
    setError(null);
    track("early_access_calc", { sessions_week: sessionsWeek, price });
    setStep(1);
    scrollToForm();
  }

  function handleIdentityContinue() {
    if (!fields.prenom.trim() || !fields.email.trim()) {
      setError("Merci de renseigner ton prénom et ton email.");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email);
    if (!emailOk) {
      setError("Merci de saisir une adresse email valide.");
      return;
    }
    setError(null);
    track("early_access_step2");
    setStep(2);
    scrollToForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.telephone.trim()) {
      setError("Merci de renseigner ton numéro de téléphone.");
      return;
    }
    if (!/^\+?[0-9 .\-()]{6,20}$/.test(fields.telephone.trim())) {
      setError("Merci de saisir un numéro de téléphone valide.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: fields.prenom.trim(),
          nom: fields.nom.trim(),
          email: fields.email.trim(),
          telephone: fields.telephone.trim(),
          website: fields.website,
          // Champs historiques de la table, remplis depuis l'étape 0 : le
          // site s'adresse aux coachs sportifs, le volume et le contexte
          // viennent des chiffres saisis.
          type_coaching: "Coach sportif / fitness",
          nb_clients: `${sessionsWeek} séances/semaine`,
          defi: `Calculateur : ${sessionsWeek} séances/semaine à ${price} €, soit environ ${Math.round(revenue)} € par mois`,
        }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json().catch(() => ({}));
      setJoinedWaitlist(Boolean(data?.waitlist));
      setAlreadyRegistered(Boolean(data?.already));
      track(
        data?.already ? "early_access_duplicate" : "early_access_submitted",
        { waitlist: Boolean(data?.waitlist) }
      );
      setSubmitted(true);
    } catch {
      setError("Une erreur est survenue. Écris-nous à contact@madger.app");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="early-access" className="py-20 sm:py-28 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(203,255,3,0.08), transparent 70%)" }}
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative max-w-xl mx-auto p-7 sm:p-10 md:p-14 rounded-3xl text-center"
          style={{
            background: "linear-gradient(180deg, #141414, #111111)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Bordure lumineuse */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(203,255,3,0.4), transparent 50%)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              padding: "1px",
            }}
          />

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div style={{ filter: "drop-shadow(0 0 24px rgba(203,255,3,0.45))" }}>
              <MadgerLogo size={56} />
            </div>
          </div>

          <h2
            className="font-extrabold text-white mb-3"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em", lineHeight: 1.1 }}
          >
            {full
              ? "L'accès fondateur est complet."
              : step === 0
              ? "Combien tu encaisses, et ce que Madger te coûte."
              : "Réserve ta place fondateur."}
          </h2>
          <p className="text-text-muted leading-relaxed mb-4" style={{ fontSize: 16 }}>
            {full
              ? "Les places fondateurs sont parties. Inscris-toi pour être prévenu en priorité de la prochaine vague."
              : step === 0
              ? "Deux curseurs, le calcul se fait en direct avec tes vrais chiffres."
              : "Les premiers membres accèdent au plan Pro offert 1 mois."}
          </p>

          {/* Value highlight / état des places */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(203,255,3,0.07)", border: "1px solid rgba(203,255,3,0.18)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#CBFF03" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 12, color: "#CBFF03", fontWeight: 600 }}>
              {full
                ? "Accès anticipé complet · liste d'attente ouverte"
                : "Plan Pro offert 1 mois · places limitées"}
            </span>
          </div>

          {/* Indicateur d'étapes */}
          {!submitted && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && (
                    <div style={{ width: 22, height: 1, background: step >= i ? "#CBFF03" : "rgba(255,255,255,0.1)" }} />
                  )}
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: step >= i ? "#CBFF03" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${step >= i ? "#CBFF03" : "rgba(255,255,255,0.12)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {step > i ? (
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M13.5 4.5l-7 7-3-3" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: step >= i ? "#000" : "var(--text-dim)" }}>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className="hidden sm:inline"
                    style={{ fontSize: 11, color: step === i ? "#fff" : "var(--text-dim)", fontWeight: step === i ? 600 : 400 }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {submitted ? (
              /* ── ÉTAT SUCCÈS ── */
              <motion.div
                key="confirm"
                ref={confirmRef}
                role="status"
                tabIndex={-1}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 px-6 rounded-2xl outline-none"
                style={{ background: "rgba(203,255,3,0.08)", border: "1px solid rgba(203,255,3,0.2)" }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4">
                  <path d="M20 6L9 17L4 12" stroke="#CBFF03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="font-bold text-white mb-2" style={{ fontSize: 18 }}>
                  {alreadyRegistered
                    ? "Tu es déjà inscrit."
                    : joinedWaitlist
                    ? "Tu es sur la liste."
                    : "Demande reçue."}
                </p>
                <p style={{ color: "#8A8A8A", fontSize: 14, lineHeight: 1.7 }}>
                  {alreadyRegistered ? (
                    <>
                      Cette adresse email fait déjà partie de la liste,
                      ta place est bien réservée.<br />
                      On te contacte dès que Madger est disponible.
                    </>
                  ) : joinedWaitlist ? (
                    <>
                      Les places fondateurs sont parties, mais tu es prioritaire
                      sur la prochaine vague.<br />
                      On te contacte dès qu'une place se libère.
                    </>
                  ) : (
                    <>
                      On te contacte dès que Madger est disponible.<br />
                      Garde un œil sur ta boîte mail.
                    </>
                  )}
                </p>
              </motion.div>
            ) : step === 0 ? (
              /* ── ÉTAPE 0 : les chiffres du coach ── */
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-5 text-left"
              >
                <label className="flex flex-col gap-2">
                  <span className="flex items-baseline justify-between text-xs" style={{ color: "#C9C9C4" }}>
                    Séances que tu donnes par semaine
                    <span className="text-white font-bold tabular-nums text-sm">{sessionsWeek}</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    value={sessionsWeek}
                    onChange={(e) => setSessionsWeek(Number(e.target.value))}
                    className="w-full accent-[#CBFF03]"
                    aria-label="Séances par semaine"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="flex items-baseline justify-between text-xs" style={{ color: "#C9C9C4" }}>
                    Prix d&apos;une séance
                    <span className="text-white font-bold tabular-nums text-sm">{eur(price)}</span>
                  </span>
                  <input
                    type="range"
                    min={15}
                    max={150}
                    step={5}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full accent-[#CBFF03]"
                    aria-label="Prix d'une séance"
                  />
                </label>

                {/* Résultat en direct : uniquement des chiffres calculés
                    depuis la saisie et les taux réels. */}
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "rgba(203,255,3,0.05)", border: "1px solid rgba(203,255,3,0.2)" }}
                >
                  <p className="text-xs" style={{ color: "#8C8C8C" }}>
                    Environ {monthlySessions} séances par mois, soit
                  </p>
                  <p className="text-white font-extrabold tabular-nums" style={{ fontSize: "clamp(28px, 5vw, 40px)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                    {eur(revenue)}
                    <span className="text-sm font-semibold" style={{ color: "#9a9a9a" }}> encaissés par mois</span>
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.25)" }}>
                      <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#8A8A8A" }}>Essentiel</p>
                      <p className="mt-0.5 text-white font-bold tabular-nums">{eur(essentialCost)}<span className="text-[11px] font-medium" style={{ color: "#9a9a9a" }}> / mois</span></p>
                      <p className="text-[11px]" style={{ color: "#8C8C8C" }}>0 € tant que tu ne vends pas</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.25)", border: proCheaper ? "1px solid rgba(203,255,3,0.35)" : "1px solid transparent" }}>
                      <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#CBFF03" }}>Pro</p>
                      <p className="mt-0.5 text-white font-bold tabular-nums">{eur(proCost)}<span className="text-[11px] font-medium" style={{ color: "#9a9a9a" }}> / mois</span></p>
                      <p className="text-[11px]" style={{ color: "#8C8C8C" }}>offert 1 mois aux fondateurs</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold" style={{ color: "#CBFF03" }}>
                    {proCheaper
                      ? `À ton volume, Pro te coûte ${eur(essentialCost - proCost)} de moins qu'Essentiel chaque mois.`
                      : `Au-delà de ${eur(breakeven)} encaissés par mois, Pro te coûte moins cher qu'Essentiel.`}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: "#8C8C8C" }}>
                    Une séance annulée à la dernière minute et non payée, c&apos;est {eur(price)} perdus. Avec Madger, le paiement se fait à la réservation et ta règle d&apos;annulation s&apos;applique toute seule.
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={handleCalcContinue}
                  className="cta-shine w-full py-4 rounded-xl text-black font-bold text-sm"
                  style={{ background: "#CBFF03" }}
                  whileHover={{ boxShadow: "0 0 30px rgba(203,255,3,0.35)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  {full ? "Rejoindre la liste d'attente →" : "Réserver ma place fondateur →"}
                </motion.button>
              </motion.div>
            ) : step === 1 ? (
              /* ── ÉTAPE 1 : identité ── */
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 text-left"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <Label>Prénom<Required /></Label>
                    <input
                      type="text"
                      placeholder="Prénom"
                      autoComplete="given-name"
                      value={fields.prenom}
                      onChange={set("prenom")}
                      className={cls}
                      style={inputBase}
                      onFocus={focusOn}
                      onBlur={focusOff}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <Label>Nom</Label>
                    <input
                      type="text"
                      placeholder="Nom"
                      autoComplete="family-name"
                      value={fields.nom}
                      onChange={set("nom")}
                      className={cls}
                      style={inputBase}
                      onFocus={focusOn}
                      onBlur={focusOff}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <Label>Adresse email<Required /></Label>
                  <input
                    type="email"
                    placeholder="toi@exemple.com"
                    autoComplete="email"
                    value={fields.email}
                    onChange={set("email")}
                    className={cls}
                    style={inputBase}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </label>

                {error && <p role="alert" className="text-sm text-danger text-center">{error}</p>}

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(0); setError(null); }}
                    aria-label="Retour"
                    className="py-4 px-5 rounded-xl text-white font-semibold text-sm flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    ←
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleIdentityContinue}
                    className="cta-shine flex-1 py-4 rounded-xl text-black font-bold text-sm"
                    style={{ background: "#CBFF03" }}
                    whileHover={{ boxShadow: "0 0 30px rgba(203,255,3,0.35)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Continuer →
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              /* ── ÉTAPE 2 : téléphone ── */
              <motion.form
                key="step2"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 text-left"
              >
                {/* Honeypot : hors écran, ignoré par les lecteurs d'écran et le focus clavier */}
                <input
                  type="text"
                  name="website"
                  value={fields.website}
                  onChange={set("website")}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                />
                <p className="text-sm text-center" style={{ color: "#8A8A8A" }}>
                  Dernière étape, {fields.prenom.trim()} : ton numéro, pour t&apos;appeler quand ton accès est prêt.
                </p>
                <label className="flex flex-col gap-1.5">
                  <Label>Téléphone<Required /></Label>
                  <input
                    type="tel"
                    placeholder="+33 6 00 00 00 00"
                    autoComplete="tel"
                    autoFocus
                    value={fields.telephone}
                    onChange={set("telephone")}
                    className={cls}
                    style={inputBase}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </label>

                {error && <p role="alert" className="text-sm text-danger text-center">{error}</p>}

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); }}
                    aria-label="Retour"
                    className="py-4 px-5 rounded-xl text-white font-semibold text-sm flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    ←
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="cta-shine flex-1 py-4 rounded-xl text-black font-bold text-sm"
                    style={{ background: "#CBFF03", opacity: loading ? 0.7 : 1 }}
                    whileHover={!loading ? { boxShadow: "0 0 30px rgba(203,255,3,0.35)" } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                  >
                    {loading
                      ? "Envoi en cours…"
                      : full
                      ? "Rejoindre la liste d'attente"
                      : "Valider ma place fondateur"}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {!submitted && (
            <>
              <p className="text-xs mt-6" style={{ color: "#3A3A3A" }}>
                Accès sélectionné manuellement. Aucun spam.
              </p>
              {/* Information RGPD (art. 13) au point de collecte. */}
              <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "#3A3A3A" }}>
                Tes coordonnées servent uniquement à te recontacter pour le
                lancement de Madger (base légale : consentement), conservées
                3 ans maximum.{" "}
                <a
                  href="/politique-de-confidentialite"
                  className="underline"
                  style={{ color: "#5A5A5A" }}
                >
                  Politique de confidentialité
                </a>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
