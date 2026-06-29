import Topbar from "@/components/dashboard/Topbar";
import StatCard from "@/components/dashboard/StatCard";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import { getServerDictionary } from "@/lib/i18n/server";

// Vue d'ensemble — premier écran après connexion. Phase 0 : chiffres à zéro
// (pas encore de BDD branchée) + checklist d'onboarding. Le but ici est de
// valider la structure responsive et le rendu dark mode.

export default function OverviewPage() {
  const { dict } = getServerDictionary();
  const o = dict.overview;

  // Placeholders : remplacés par les vraies données en Phase 3.
  const stats = [
    { label: o.revenueMonth, value: "0 €", trend: null },
    { label: o.sessionsWeek, value: "0", trend: null },
    { label: o.activeClients, value: "0", trend: null },
    { label: o.pendingPayments, value: "0 €", trend: null },
  ];

  return (
    <>
      <Topbar title={o.title} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl font-semibold text-text-base sm:text-2xl">
            {o.greeting} 👋
          </h2>
          <p className="mt-1 text-sm text-text-muted">{o.subtitle}</p>
        </div>

        {/* Cartes stats : 1 col mobile → 2 → 4 en desktop */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>

        {/* Contenu principal : checklist + prochaines séances */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <section className="rounded-xl border border-border bg-bg-card p-5">
              <h3 className="text-base font-semibold text-text-base">
                {o.nextSessions}
              </h3>
              <p className="mt-6 text-center text-sm text-text-dim">
                {o.noSessions}
              </p>
            </section>
          </div>

          <div className="lg:col-span-1">
            <SetupChecklist />
          </div>
        </div>
      </main>
    </>
  );
}
