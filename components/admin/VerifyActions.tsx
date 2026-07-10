"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Boutons Valider / Refuser d'une demande de vérification (admin). Le refus
// demande un motif court, renvoyé au coach.
export default function VerifyActions({ coachId }: { coachId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  async function act(action: "approve" | "reject") {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId, action, note: note.trim() || null }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Motif du refus (visible par le coach)"
          className="rounded-lg border border-border-strong bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => act("reject")}
            className="rounded-full bg-danger px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Confirmer le refus
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            className="rounded-full border border-border-strong px-4 py-1.5 text-xs font-medium text-text-muted"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => act("approve")}
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
      >
        Valider
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setRejecting(true)}
        className="rounded-full border border-border-strong px-4 py-1.5 text-xs font-medium text-text-muted hover:text-danger"
      >
        Refuser
      </button>
    </div>
  );
}
