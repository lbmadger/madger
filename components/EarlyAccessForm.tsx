"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MadgerLogo from "@/components/ui/MadgerLogo";

const inputBase = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
};

const selectArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238A8A8A' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`;

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

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = "#CBFF03";
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = "rgba(255,255,255,0.12)";
}

const cls = "w-full px-5 py-3.5 rounded-xl text-white text-sm outline-none";

export default function EarlyAccessForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // On ne récupère QUE l'état complet/pas complet (aucun nombre exposé, pour
  // que personne ne puisse suivre la progression des inscriptions).
  const [full, setFull] = useState(false);
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);

  useEffect(() => {
    fetch("/api/early-access")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setFull(Boolean(d.full)))
      .catch(() => {});
  }, []);

  const [fields, setFields] = useState({
    prenom: "",
    nom: "",
    email: "",
    type_coaching: "",
    nb_clients: "",
    telephone: "",
    instagram_site: "",
    defi: "",
  });

  function set(k: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFields((prev) => ({ ...prev, [k]: e.target.value }));
  }

  function handleContinue() {
    if (!fields.prenom.trim() || !fields.email.trim() || !fields.type_coaching) {
      setError("Merci de renseigner tous les champs obligatoires.");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email);
    if (!emailOk) {
      setError("Merci de saisir une adresse email valide.");
      return;
    }
    setError(null);
    setStep(2);
    window.scrollTo({ top: document.getElementById("early-access")?.offsetTop ?? 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.nb_clients || !fields.telephone.trim() || !fields.defi.trim()) {
      setError("Merci de renseigner tous les champs obligatoires.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json().catch(() => ({}));
      setJoinedWaitlist(Boolean(data?.waitlist));
      setSubmitted(true);
    } catch {
      setError("Une erreur est survenue. Écris-nous à contact@madger.app");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="early-access" className="py-28 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(203,255,3,0.08), transparent 70%)" }}
      />


      <div className="relative max-w-6xl mx-auto px-6">
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
            {full ? "L'accès fondateur est complet." : "Rejoignez les premiers coachs Madger."}
          </h2>
          <p className="text-text-muted leading-relaxed mb-4" style={{ fontSize: 16 }}>
            {full
              ? "Les places fondateurs sont parties. Inscrivez-vous pour être prévenu en priorité de la prochaine vague."
              : "Les premiers membres accèdent au plan Pro offert 3 mois."}
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
                : "Plan Pro offert 3 mois · places limitées"}
            </span>
          </div>

          {/* Step indicator */}
          {!submitted && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {/* Step 1 */}
              <div
                style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: step >= 1 ? "#CBFF03" : "rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {step > 1 ? (
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M13.5 4.5l-7 7-3-3" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#000" }}>1</span>
                )}
              </div>
              <span style={{ fontSize: 11, color: step === 1 ? "#fff" : "#5A5A5A", fontWeight: step === 1 ? 600 : 400 }}>
                Votre profil
              </span>
              {/* Connector */}
              <div style={{ width: 28, height: 1, background: step > 1 ? "#CBFF03" : "rgba(255,255,255,0.1)", margin: "0 4px" }} />
              {/* Step 2 */}
              <div
                style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: step >= 2 ? "#CBFF03" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${step >= 2 ? "#CBFF03" : "rgba(255,255,255,0.12)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: step >= 2 ? "#000" : "#5A5A5A" }}>2</span>
              </div>
              <span style={{ fontSize: 11, color: step === 2 ? "#fff" : "#5A5A5A", fontWeight: step === 2 ? 600 : 400 }}>
                Votre activité
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── ÉTAT SUCCÈS ── */}
            {submitted ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 px-6 rounded-2xl"
                style={{ background: "rgba(203,255,3,0.08)", border: "1px solid rgba(203,255,3,0.2)" }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4">
                  <path d="M20 6L9 17L4 12" stroke="#CBFF03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="font-bold text-white mb-2" style={{ fontSize: 18 }}>
                  {joinedWaitlist ? "Vous êtes sur la liste." : "Demande reçue."}
                </p>
                <p style={{ color: "#8A8A8A", fontSize: 14, lineHeight: 1.7 }}>
                  {joinedWaitlist ? (
                    <>
                      Les places fondateurs sont parties, mais vous êtes prioritaire
                      sur la prochaine vague.<br />
                      On vous contacte dès qu'une place se libère.
                    </>
                  ) : (
                    <>
                      On vous contacte dès que Madger est disponible.<br />
                      Gardez un oeil sur votre boite mail.
                    </>
                  )}
                </p>
              </motion.div>

            ) : step === 1 ? (
              /* ── ÉTAPE 1 ── */
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
                    placeholder="vous@exemple.com"
                    value={fields.email}
                    onChange={set("email")}
                    className={cls}
                    style={inputBase}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <Label>Type de coaching<Required /></Label>
                  <select
                    value={fields.type_coaching}
                    onChange={set("type_coaching")}
                    className={`${cls} appearance-none`}
                    style={{
                      ...inputBase,
                      color: fields.type_coaching ? "#fff" : "#5A5A5A",
                      backgroundImage: selectArrow,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 18px center",
                      paddingRight: "44px",
                    }}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  >
                    <option value="" disabled style={{ color: "#5A5A5A", background: "#141414" }}>Sélectionner</option>
                    <option style={{ color: "#fff", background: "#141414" }}>Coach sportif / fitness</option>
                    <option style={{ color: "#fff", background: "#141414" }}>Préparateur physique</option>
                    <option style={{ color: "#fff", background: "#141414" }}>Coach bien-être</option>
                    <option style={{ color: "#fff", background: "#141414" }}>Coach en développement personnel</option>
                    <option style={{ color: "#fff", background: "#141414" }}>Coach business / accompagnement</option>
                    <option style={{ color: "#fff", background: "#141414" }}>Autre</option>
                  </select>
                </label>

                {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                <motion.button
                  type="button"
                  onClick={handleContinue}
                  className="w-full py-4 rounded-xl text-black font-bold text-sm mt-2"
                  style={{ background: "#CBFF03" }}
                  whileHover={{ boxShadow: "0 0 30px rgba(203,255,3,0.35)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continuer →
                </motion.button>
              </motion.div>

            ) : (
              /* ── ÉTAPE 2 ── */
              <motion.form
                key="step2"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 text-left"
              >
                <label className="flex flex-col gap-1.5">
                  <Label>Nombre de clients actifs<Required /></Label>
                  <select
                    value={fields.nb_clients}
                    onChange={set("nb_clients")}
                    className={`${cls} appearance-none`}
                    style={{
                      ...inputBase,
                      color: fields.nb_clients ? "#fff" : "#5A5A5A",
                      backgroundImage: selectArrow,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 18px center",
                      paddingRight: "44px",
                    }}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  >
                    <option value="" disabled style={{ color: "#5A5A5A", background: "#141414" }}>Sélectionner</option>
                    <option style={{ color: "#fff", background: "#141414" }}>Moins de 5</option>
                    <option style={{ color: "#fff", background: "#141414" }}>5 à 15</option>
                    <option style={{ color: "#fff", background: "#141414" }}>15 à 30</option>
                    <option style={{ color: "#fff", background: "#141414" }}>Plus de 30</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <Label>Téléphone<Required /></Label>
                  <input
                    type="tel"
                    placeholder="+33 6 00 00 00 00"
                    value={fields.telephone}
                    onChange={set("telephone")}
                    className={cls}
                    style={inputBase}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <Label>Instagram ou site <span style={{ color: "#5A5A5A" }}>(optionnel)</span></Label>
                  <input
                    type="text"
                    placeholder="@votre_compte ou https://..."
                    value={fields.instagram_site}
                    onChange={set("instagram_site")}
                    className={cls}
                    style={inputBase}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <Label>Qu'est-ce que vous souhaitez arrêter de gérer manuellement ?<Required /></Label>
                  <textarea
                    placeholder="Ex : les relances de paiement, les factures en fin de mois…"
                    value={fields.defi}
                    onChange={set("defi")}
                    rows={3}
                    className={`${cls} resize-none`}
                    style={inputBase}
                    onFocus={focusOn}
                    onBlur={focusOff}
                  />
                </label>

                {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); }}
                    className="py-4 px-5 rounded-xl text-white font-semibold text-sm flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    ←
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 rounded-xl text-black font-bold text-sm"
                    style={{ background: "#CBFF03", opacity: loading ? 0.7 : 1 }}
                    whileHover={!loading ? { boxShadow: "0 0 30px rgba(203,255,3,0.35)" } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                  >
                    {loading
                      ? "Envoi en cours…"
                      : full
                      ? "Rejoindre la liste d'attente"
                      : "Rejoindre l'accès prioritaire"}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {!submitted && (
            <p className="text-xs mt-6" style={{ color: "#3A3A3A" }}>
              Accès sélectionné manuellement. Aucun spam.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
