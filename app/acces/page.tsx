"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import MadgerLogo from "@/components/ui/MadgerLogo";

// Page de saisie du code d'accès pré-lancement. Une fois le bon code entré,
// le cookie est posé et l'utilisateur est redirigé vers sa destination.
// C'est la première porte du produit : elle doit donner le sentiment
// d'entrer dans un club privé.
function AccessForm() {
  const params = useSearchParams();
  const rawNext = params.get("next") || "/dashboard";
  // Anti open-redirect : uniquement des chemins internes.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        window.location.href = next;
        return;
      }
      setError(true);
      setShake((n) => n + 1);
    } catch {
      setError(true);
      setShake((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A] px-6">
      {/* Halo lumineux d'ambiance */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#CBFF03]/[0.06] blur-[130px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm text-center"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center"
        >
          <MadgerLogo size={44} />
        </motion.div>

        <p className="mt-4 text-sm font-extrabold tracking-tight text-white">
          Madger
          <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-[#CBFF03]/30 bg-[#CBFF03]/10 px-2 py-0.5 text-[10px] font-semibold text-[#CBFF03]">
            <span className="glow-dot h-1 w-1 rounded-full bg-[#CBFF03]" />
            accès privé
          </span>
        </p>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
          Bienvenue dans le <span className="text-shimmer">club</span>.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#9a9a9a]">
          Madger n&apos;est pas encore ouvert à tout le monde. Si tu as le
          code, tu fais partie des premiers.
        </p>

        <motion.form
          key={shake}
          animate={shake > 0 ? { x: [0, -9, 9, -6, 6, -3, 0] } : {}}
          transition={{ duration: 0.4 }}
          onSubmit={submit}
          className="mt-7 flex flex-col gap-3"
        >
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code d'accès"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-base tracking-widest text-white outline-none transition-colors focus:border-[#CBFF03]"
          />
          {error && (
            <p className="text-sm text-danger">Code incorrect. Réessaie.</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="cta-shine w-full rounded-full bg-[#CBFF03] px-4 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <span>{loading ? "Vérification…" : "Entrer"}</span>
          </button>
        </motion.form>

        <a
          href="/"
          className="mt-7 inline-block text-xs text-[#5A5A5A] transition-colors hover:text-[#9a9a9a]"
        >
          ‹ Retour à l&apos;accueil
        </a>
      </motion.div>
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense>
      <AccessForm />
    </Suspense>
  );
}
