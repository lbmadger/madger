"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Status = "none" | "pending" | "verified" | "rejected";

// Dépôt du diplôme (BPJEPS / DE) pour obtenir le badge « Coach vérifié ».
// Le fichier part dans le bucket privé "diplomas" (jamais public) ; l'équipe
// Madger valide ensuite dans l'admin.
export default function VerificationSection({
  coachId,
  status,
  note,
}: {
  coachId: string;
  status: Status;
  note: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    const okType =
      file.type.startsWith("image/") || file.type === "application/pdf";
    if (!okType || file.size > 10 * 1024 * 1024) {
      setError(t("verification.errorFile"));
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${coachId}/diploma-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("diplomas")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setError(t("verification.errorGeneric"));
        return;
      }
      const { error: dbErr } = await supabase
        .from("coaches")
        .update({
          verification_doc_path: path,
          verification_status: "pending",
          verification_submitted_at: new Date().toISOString(),
          verification_note: null,
        })
        .eq("id", coachId);
      if (dbErr) {
        setError(t("verification.errorGeneric"));
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  if (status === "verified") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-text-base">
            {t("verification.statusVerified")}
          </p>
          <p className="text-xs text-text-muted">
            {t("verification.verifiedDesc")}
          </p>
        </div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="rounded-xl border border-warning/25 bg-warning/[0.06] p-4">
        <p className="text-sm font-semibold text-text-base">
          {t("verification.statusPending")}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {t("verification.pendingDesc")}
        </p>
      </div>
    );
  }

  // none | rejected → invitation à déposer (ou re-déposer) le diplôme.
  return (
    <div>
      {status === "rejected" && (
        <div className="mb-3 rounded-xl border border-danger/25 bg-danger/[0.06] p-3">
          <p className="text-sm font-semibold text-danger">
            {t("verification.statusRejected")}
          </p>
          {note && <p className="mt-0.5 text-xs text-text-muted">{note}</p>}
        </div>
      )}
      <p className="text-sm text-text-muted">{t("verification.uploadIntro")}</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {uploading
          ? t("verification.uploading")
          : status === "rejected"
          ? t("verification.reuploadCta")
          : t("verification.uploadCta")}
      </button>
      <p className="mt-2 text-[11px] text-text-dim">{t("verification.hint")}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
