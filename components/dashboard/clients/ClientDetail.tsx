"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Client } from "@/lib/clients/types";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";

// Fiche client : lecture, modification inline et suppression. Les écritures
// passent par le client navigateur (RLS borne au coach propriétaire).

export default function ClientDetail({ client }: { client: Client }) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(client.first_name);
  const [lastName, setLastName] = useState(client.last_name ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const since = new Date(client.created_at).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-GB",
    { year: "numeric", month: "long", day: "numeric" }
  );

  async function handleSave() {
    setError(null);
    if (!firstName.trim()) {
      setError(t("clients.errors.firstNameRequired"));
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("clients")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        })
        .eq("id", client.id);
      if (error) {
        setError(t("clients.errors.generic"));
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError(t("clients.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t("clients.detail.deleteConfirm"))) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);
      if (error) {
        setError(t("clients.errors.generic"));
        setLoading(false);
        return;
      }
      router.push("/dashboard/clients");
      router.refresh();
    } catch {
      setError(t("clients.errors.generic"));
      setLoading(false);
    }
  }

  return (
    <>
      <Link
        href="/dashboard/clients"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-base"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {t("clients.detail.back")}
      </Link>

      <div className="rounded-2xl border border-border bg-bg-card p-5 sm:p-6">
        {!editing ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-base font-semibold text-accent">
                  {(client.first_name.charAt(0) + (client.last_name?.charAt(0) ?? "")).toUpperCase()}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-text-base">
                    {[client.first_name, client.last_name].filter(Boolean).join(" ")}
                  </h2>
                  <p className="text-xs text-text-dim">
                    {t("clients.detail.since")} {since}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setEditing(true)}
                className="shrink-0 px-4 py-2"
              >
                {t("clients.detail.edit")}
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {(client.email || client.phone) && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
                    {t("clients.detail.contact")}
                  </p>
                  <div className="mt-1 space-y-0.5 text-sm text-text-base">
                    {client.email && <p>{client.email}</p>}
                    {client.phone && <p>{client.phone}</p>}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
                  {t("clients.detail.notes")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-base">
                  {client.notes || (
                    <span className="text-text-dim">
                      {t("clients.detail.noNotes")}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="mt-6 text-sm font-medium text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {t("clients.detail.delete")}
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <EditField label={t("clients.form.firstName")} value={firstName} onChange={setFirstName} />
              <EditField label={t("clients.form.lastName")} value={lastName} onChange={setLastName} />
            </div>
            <EditField label={t("clients.form.email")} value={email} onChange={setEmail} type="email" />
            <EditField label={t("clients.form.phone")} value={phone} onChange={setPhone} type="tel" />
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{t("clients.form.notes")}</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </label>

            {error && <p role="alert" className="text-sm text-danger">{error}</p>}

            <div className="mt-1 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditing(false)}
                className="flex-1"
              >
                {t("clients.form.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? t("clients.detail.saving") : t("clients.detail.save")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && !editing && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}
