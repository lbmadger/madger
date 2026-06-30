"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Client } from "@/lib/clients/types";
import AddClientModal from "./AddClientModal";
import Button from "@/components/ui/Button";
import { interactiveCardClass } from "@/lib/ui/styles";

function initials(c: Client): string {
  const a = c.first_name?.charAt(0) ?? "";
  const b = c.last_name?.charAt(0) ?? "";
  return (a + b).toUpperCase() || "?";
}

function fullName(c: Client): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

export default function ClientsView({
  initialClients,
}: {
  initialClients: Client[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  // La liste vient des props serveur : après un ajout, router.refresh()
  // recharge les données et met à jour cet affichage. On filtre localement.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialClients;
    return initialClients.filter((c) =>
      [c.first_name, c.last_name, c.email, c.phone]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [initialClients, query]);

  return (
    <>
      {/* En-tête : compteur + recherche + bouton d'ajout */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text-base">
            {initialClients.length}
          </span>{" "}
          {t("clients.count")}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("clients.search")}
            className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-2.5 text-base text-text-base outline-none transition-colors placeholder:text-text-dim focus:border-accent sm:w-56"
          />
          <Button
            onClick={() => setAdding(true)}
            className="shrink-0 whitespace-nowrap px-4 py-2.5"
          >
            + {t("clients.add")}
          </Button>
        </div>
      </div>

      {/* Liste ou état vide */}
      {initialClients.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-text-base">
            {t("clients.emptyTitle")}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            {t("clients.emptyDesc")}
          </p>
          <Button onClick={() => setAdding(true)} className="mt-5">
            + {t("clients.add")}
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/clients/${c.id}`}
                className={`flex items-center gap-3 p-3 ${interactiveCardClass}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                  {initials(c)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text-base">
                    {fullName(c)}
                  </span>
                  {(c.email || c.phone) && (
                    <span className="block truncate text-xs text-text-muted">
                      {c.email || c.phone}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddClientModal
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
