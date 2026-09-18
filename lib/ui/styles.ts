// Styles partagés des champs de formulaire, calés sur la landing :
// rounded-xl, padding généreux, fond blanc très léger, bordure qui passe au
// lime au focus. Centralisés ici pour rester cohérents partout dans l'app.

export const inputClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3 text-base text-text-base outline-none transition-colors placeholder:text-text-muted focus:border-accent";

export const labelClass = "text-xs font-medium text-text-muted";

// Carte cliquable : bordure douce + léger lift et halo lime au survol.
export const interactiveCardClass =
  "rounded-2xl border border-border bg-bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-[0_0_0_1px_rgba(203,255,3,0.18),0_20px_50px_rgba(0,0,0,0.5)]";

// Conteneur horizontal du dashboard : le header (Topbar) et le <main> de
// chaque page partagent EXACTEMENT ces classes, sinon le titre et la cloche
// décrochent du contenu dès que max-w-6xl centre la page (écrans larges).
export const dashboardContainer = "mx-auto w-full max-w-6xl px-4 sm:px-6";
