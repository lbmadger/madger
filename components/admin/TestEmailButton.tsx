"use client";

import { useState } from "react";

export default function TestEmailButton() {
  const [to, setTo] = useState("l.bondeau@madger.app");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(`✅ ${data.sent}/${data.total} emails envoyés à ${data.to}`);
      } else if (data.error === "resend_not_configured") {
        setResult("⚠️ RESEND_API_KEY absente côté serveur (à définir sur Vercel).");
      } else {
        setResult(`❌ Erreur : ${data.error || "inconnue"}`);
      }
    } catch {
      setResult("❌ Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-text-dim">
          Adresse de test
        </span>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-base text-text-base outline-none focus:border-accent"
        />
      </label>
      <button
        type="button"
        onClick={send}
        disabled={loading}
        className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Envoi…" : "Envoyer les 6 emails de test"}
      </button>
      {result && <p className="mt-3 text-sm text-text-muted">{result}</p>}
    </div>
  );
}
