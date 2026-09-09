import Link from "next/link";
import { LockIcon } from "@/components/ui/icons";

// Voile Pro : le contenu (les VRAIS chiffres du coach) reste rendu mais flouté,
// avec cadenas et bouton vers l'abonnement par-dessus. Même langage que les
// statistiques avancées du tableau de bord. Rendu côté serveur, textes fournis
// par la page. En Pro : les enfants tels quels.
export default function ProBlur({
  locked,
  title,
  desc,
  cta,
  children,
  className = "",
}: {
  locked: boolean;
  title: string;
  desc?: string;
  cta: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden className="pointer-events-none select-none blur-[7px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-bg-card text-accent shadow-lg"
        >
          <LockIcon size={18} />
        </div>
        <p className="text-sm font-semibold text-text-base">{title}</p>
        {desc && <p className="max-w-sm text-xs leading-relaxed text-text-muted">{desc}</p>}
        <Link
          href="/dashboard/abonnement"
          className="mt-1 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
