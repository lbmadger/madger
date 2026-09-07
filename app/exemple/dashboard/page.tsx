import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import { DemoTopbar, DemoMobileNav, DemoSidebar } from "@/components/exemple/DemoShell";
import AnimatedStat from "@/components/dashboard/AnimatedStat";
import AreaChartCard from "@/components/dashboard/charts/AreaChartCard";
import { StarIcon } from "@/components/ui/icons";
import type { BarDatum } from "@/components/dashboard/charts/MiniBars";

// Page VITRINE : le dashboard d'Emma Laurent, la même coach que /exemple
// (45 € la séance, 4,9 sur 27 avis, Basic-Fit Paris Rue de Rivoli). À montrer aux
// futurs coachs : « voilà ton futur quotidien ». Contenu 100 % statique,
// aucune donnée en base, mêmes composants visuels que le vrai dashboard.

export const metadata: Metadata = {
  title: "Madger · Exemple de dashboard coach",
  description:
    "Découvre le tableau de bord d'un coach sur Madger : revenus, séances, clients, avis. Crée ton compte et retrouve le tien.",
  alternates: { canonical: "/exemple/dashboard" },
};

// Revenus mensuels crédibles pour 40-55 séances/mois à 45 € : progression
// régulière sans être insolente, labels des 12 derniers mois réels.
function revenueByMonth(): BarDatum[] {
  const values = [
    88000, 114000, 126000, 105000, 142000, 161000, 158000, 179000, 196000,
    214000, 205000, 238000,
  ];
  const now = new Date();
  return values.map((value, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      value,
    };
  });
}

// Prochaines séances : aujourd'hui + demain, heures de vraie journée coach.
const UPCOMING = [
  { time: "Aujourd'hui · 12:30", name: "Julie M.", service: "Séance individuelle", place: "Basic-Fit Paris Rue de Rivoli" },
  { time: "Aujourd'hui · 18:00", name: "Karim B.", service: "Séance individuelle", place: "Basic-Fit Paris Rue de Rivoli" },
  { time: "Demain · 07:30", name: "Sarah L.", service: "Pack 10 séances (6/10)", place: "À domicile" },
  { time: "Demain · 12:30", name: "Thomas R.", service: "Séance individuelle", place: "En visio" },
];

export default function ExampleDashboardPage() {
  const { locale, dict } = getServerDictionary();
  const launched = process.env.SITE_LAUNCHED === "1";
  const ctaHref = launched ? "/signup" : "/#early-access";
  const goalPct = 95; // 2 380 € sur un objectif de 2 500 €

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="flex min-h-screen bg-bg text-text-base">
        <DemoSidebar />
        <div className="min-w-0 flex-1">
        <DemoTopbar />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 sm:px-6 sm:py-8">
          {/* Bandeau vitrine, même ADN que /exemple */}
          <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-text-base">
                Ceci est un dashboard d&apos;exemple
              </p>
              <p className="mt-0.5 text-sm text-text-muted">
                Voilà ce que tu verras chaque matin quand tes clients réservent
                seuls. <Link href="/exemple" className="text-accent hover:underline">Voir sa page publique →</Link>
              </p>
            </div>
            <Link
              href={ctaHref}
              className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {launched ? "Créer mon compte" : "Créer ma page"}
            </Link>
          </div>

          {/* Salutation, comme le vrai accueil */}
          <div className="flex items-center gap-3">
            <Image
              src="https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=120&q=80"
              alt="Emma Laurent"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full border border-border-strong object-cover"
            />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Bonjour Emma
              </h1>
              <p className="text-sm text-text-muted">
                2 séances aujourd&apos;hui · la première à 12:30
              </p>
            </div>
          </div>

          {/* KPI du mois */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <AnimatedStat
              label="Revenus du mois"
              value={238000}
              kind="currency"
              locale="fr-FR"
              trend={{ text: "+16 % vs mois dernier", positive: true }}
              index={0}
            />
            <AnimatedStat
              label="Séances ce mois"
              value={52}
              kind="int"
              locale="fr-FR"
              trend={{ text: "+6 vs mois dernier", positive: true }}
              index={1}
            />
            <AnimatedStat
              label="Clients actifs"
              value={14}
              kind="int"
              locale="fr-FR"
              trend={{ text: "+2 ce mois-ci", positive: true }}
              index={2}
            />
            <AnimatedStat
              label="Note moyenne"
              value={4.9}
              kind="decimal1"
              locale="fr-FR"
              hint="27 avis clients"
              index={3}
            />
          </div>

          {/* Graphique revenus : le même composant que le vrai dashboard */}
          <div className="mt-4 sm:mt-5">
            <AreaChartCard
              title="Revenus"
              data={revenueByMonth()}
              unit="currency"
              locale="fr-FR"
              mode="months"
            />
          </div>

          {/* Semaine, paiements, messages : la richesse du vrai accueil */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-3">
            <section className="rounded-2xl border border-border bg-bg-card p-5">
              <h3 className="text-base font-semibold">Cette semaine</h3>
              <p className="mt-1 text-xs text-text-muted">12 séances · 3 créneaux libres</p>
              <div className="mt-4 flex h-16 items-end gap-1.5">
                {[3, 2, 3, 1, 2, 1, 0].map((n, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${n > 0 ? "bg-accent" : "bg-bg-elevated"}`}
                      style={{ height: `${Math.max(6, n * 18)}px` }}
                    />
                    <span className="text-[10px] text-text-dim">{"LMMJVSD"[i]}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-bg-card p-5">
              <h3 className="text-base font-semibold">Paiements</h3>
              <p className="mt-3 text-xs font-medium text-text-dim">Sous séquestre</p>
              <p className="font-display text-xl font-extrabold">135 €</p>
              <p className="mt-2 text-xs font-medium text-text-dim">Versé ce mois-ci</p>
              <p className="font-display text-xl font-extrabold text-accent">1 890 €</p>
            </section>
            <section className="rounded-2xl border border-border bg-bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Messages</h3>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-black">2</span>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {[
                  ["Julie M.", "On garde 12h30 demain ?"],
                  ["Karim B.", "Merci pour le programme 🙏"],
                ].map(([n, m]) => (
                  <li key={n} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">{n.charAt(0)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n}</p>
                      <p className="truncate text-xs text-text-muted">{m}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 lg:grid-cols-3">
            {/* Prochaines séances */}
            <section className="rounded-2xl border border-border bg-bg-card p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Prochaines séances</h3>
                <span className="text-xs font-medium text-accent">
                  Agenda complet
                </span>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {UPCOMING.map((s) => (
                  <li
                    key={`${s.time}-${s.name}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated p-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                      {s.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.name}{" "}
                        <span className="font-normal text-text-muted">
                          · {s.service}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-dim">
                        {s.place}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-text-muted">
                      {s.time}
                    </span>
                    <span className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg border border-accent/30 bg-accent/[0.05] px-2 py-1.5 text-[10px] font-semibold text-accent">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>
                      Objectifs
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Colonne droite : objectif + dernier avis */}
            <div className="flex flex-col gap-4">
              <section className="rounded-2xl border border-border bg-bg-card p-5">
                <h3 className="text-base font-semibold">Objectif du mois</h3>
                <p className="mt-3 font-display text-2xl font-extrabold">
                  2 380 €{" "}
                  <span className="text-sm font-medium text-text-dim">
                    / 2 500 €
                  </span>
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  Encore 3 séances et c&apos;est gagné.
                </p>
              </section>

              <section className="rounded-2xl border border-border bg-bg-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Dernier avis</h3>
                  <span className="flex items-center gap-1 text-sm font-bold text-accent">
                    5 <StarIcon size={12} />
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  « Emma est top ! En 3 mois j&apos;ai perdu 6 kg et surtout
                  j&apos;ai enfin pris goût au sport. »
                </p>
                <p className="mt-2 text-xs text-text-dim">Julie · cette semaine</p>
              </section>
            </div>
          </div>

          {/* CTA final */}
          <div className="mt-8 rounded-2xl border border-border bg-bg-card p-8 text-center">
            <h2 className="text-xl font-extrabold tracking-tight">
              Ce dashboard sera le tien.
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
              Ta page de réservation, tes paiements sécurisés et tes chiffres,
              réunis au même endroit. Essentiel à 0 € par mois pour commencer.
            </p>
            <Link
              href={ctaHref}
              className="mt-5 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {launched ? "Créer mon compte gratuitement" : "Rejoindre l'accès anticipé"}
            </Link>
          </div>
        </main>
        </div>
        <DemoMobileNav />
      </div>
    </I18nProvider>
  );
}
