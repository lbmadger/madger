"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { type Service, formatPrice } from "@/lib/services/types";
import AddServiceModal from "./AddServiceModal";

export default function ServicesView({
  initialServices,
  canCreate = true,
}: {
  initialServices: Service[];
  // false → compte Stripe pas encore actif : pas de création de prestation.
  canCreate?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  async function handleDelete(id: string) {
    if (!window.confirm(t("services.deleteConfirm"))) return;
    setDeleteError(false);
    const supabase = createClient();
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      setDeleteError(true);
      return;
    }
    router.refresh();
  }

  function priceLine(s: Service): string {
    const base = formatPrice(s.price_cents, s.currency, locale);
    if (s.type === "subscription") return `${base}${t("services.perMonth")}`;
    return base;
  }

  function metaLine(s: Service): string {
    const parts: string[] = [t(`services.types.${s.type}`)];
    if (s.type === "pack" && s.pack_size)
      parts.push(`${s.pack_size} ${t("services.sessionsLabel")}`);
    if (s.duration_min) parts.push(`${s.duration_min} min`);
    return parts.join(" · ");
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text-base">
            {initialServices.length}
          </span>{" "}
          {t("services.title").toLowerCase()}
        </p>
        <Button
          onClick={() => setAdding(true)}
          disabled={!canCreate}
          title={!canCreate ? t("services.needStripeTitle") : undefined}
          className="shrink-0 whitespace-nowrap px-4 py-2.5"
        >
          + {t("services.add")}
        </Button>
      </div>

      {initialServices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-text-base">
            {t("services.emptyTitle")}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            {t("services.emptyDesc")}
          </p>
          <Button
            onClick={() => setAdding(true)}
            disabled={!canCreate}
            title={!canCreate ? t("services.needStripeTitle") : undefined}
            className="mt-5"
          >
            + {t("services.add")}
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialServices.map((s) => (
            <li
              key={s.id}
              className="flex flex-col rounded-2xl border border-border bg-bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-text-base">
                    {s.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-muted">{metaLine(s)}</p>
                </div>
                <span className="shrink-0 text-right text-lg font-bold text-accent">
                  {priceLine(s)}
                </span>
              </div>

              {s.description && (
                <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                  {s.description}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    s.location === "online"
                      ? "bg-accent/10 text-accent"
                      : "border border-border-strong text-text-muted"
                  }`}
                >
                  {s.location === "online"
                    ? t("services.form.online")
                    : t("services.form.inPerson")}
                </span>
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className="text-xs font-medium text-text-muted transition-colors hover:text-accent"
                  >
                    {t("services.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="text-xs font-medium text-red-400 transition-opacity hover:opacity-80"
                  >
                    {t("services.delete")}
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteError && (
        <p className="mt-3 text-sm text-red-400">{t("services.errors.generic")}</p>
      )}

      {adding && (
        <AddServiceModal
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <AddServiceModal
          service={editing}
          onClose={() => setEditing(null)}
          onCreated={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
