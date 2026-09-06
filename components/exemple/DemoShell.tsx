import Link from "next/link";
import MadgerLogo from "@/components/ui/MadgerLogo";

// Habillage du dashboard de démonstration : barre du haut et barre du bas
// IDENTIQUES au vrai dashboard (mêmes icônes, même capsule flottante, même
// pastille accent), en version statique. Un futur coach voit l'app entière,
// pas une page isolée : accueil, clients, agenda, prestations, messages.

const TABS = [
  { label: "Accueil", active: true, d: "M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" },
  { label: "Clients", d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-1a6 6 0 016-6h6a6 6 0 016 6v1" },
  { label: "Agenda", d: "M7 3v3m10-3v3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" },
  { label: "Prestations", d: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-8.1-8.1A2 2 0 012 11.2V4a2 2 0 012-2h7.2a2 2 0 011.4.6l8 8a2 2 0 010 2.8zM7.5 7.5h.01" },
  { label: "Messages", d: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" },
];

export function DemoTopbar() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6">
      <h1 className="text-lg font-extrabold tracking-tight text-text-base">Accueil</h1>
      <Link href="/exemple" aria-label="Madger" className="absolute left-1/2 -translate-x-1/2 sm:hidden">
        <span className="block overflow-hidden rounded-[9px] border border-border-strong">
          <MadgerLogo size={30} />
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-2.5">
        {/* Lien de réservation : version compacte mobile, pilule desktop */}
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/[0.05] text-accent lg:hidden">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </span>
        <span className="hidden items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.05] py-1.5 pl-3 pr-1.5 lg:flex">
          <span className="text-xs font-semibold text-accent">madger.app/emma-laurent</span>
          <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-black">Copier</span>
        </span>
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-black">
            2
          </span>
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent md:hidden">
          E
        </span>
      </div>
    </header>
  );
}

export function DemoMobileNav() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 px-3 md:hidden"
      style={{ paddingBottom: "max(0.6rem, env(safe-area-inset-bottom))" }}
    >
      <nav className="relative flex rounded-[26px] border border-border-strong bg-bg-elevated p-1.5 shadow-[0_10px_36px_rgba(0,0,0,0.6)]">
        <span
          aria-hidden
          className="absolute bottom-1.5 left-1.5 top-1.5 rounded-[20px] bg-accent"
          style={{ width: `calc((100% - 12px) / ${TABS.length})` }}
        />
        {TABS.map((tab) => (
          <span
            key={tab.label}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2"
          >
            <span className="relative">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={tab.active ? "text-black" : "text-text-muted"}
              >
                <path d={tab.d} />
              </svg>
              {tab.label === "Messages" && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-black">
                  2
                </span>
              )}
            </span>
            <span
              className={`relative max-w-full truncate text-[10px] font-semibold ${
                tab.active ? "text-black" : "text-text-muted"
              }`}
            >
              {tab.label}
            </span>
          </span>
        ))}
      </nav>
    </div>
  );
}
