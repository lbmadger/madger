"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui/styles";

// Modal d'ajout d'un client. Insère via le client navigateur Supabase :
// la politique RLS impose coach_id = utilisateur courant, qu'on renseigne
// avec l'id récupéré de la session.

export default function AddClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError(t("clients.errors.firstNameRequired"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t("clients.errors.generic"));
        return;
      }

      const { error } = await supabase.from("clients").insert({
        coach_id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });

      if (error) {
        setError(t("clients.errors.generic"));
        return;
      }
      onCreated();
    } catch {
      setError(t("clients.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-base">
          {t("clients.form.title")}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t("clients.form.firstName")}
              value={firstName}
              onChange={setFirstName}
              required
              autoFocus
            />
            <Field
              label={t("clients.form.lastName")}
              value={lastName}
              onChange={setLastName}
            />
          </div>
          <Field
            label={t("clients.form.email")}
            value={email}
            onChange={setEmail}
            type="email"
          />
          <Field
            label={t("clients.form.phone")}
            value={phone}
            onChange={setPhone}
            type="tel"
          />
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("clients.form.notes")}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("clients.form.notesPlaceholder")}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              {t("clients.form.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t("clients.form.creating") : t("clients.form.create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}
