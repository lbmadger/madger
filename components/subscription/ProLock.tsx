import Link from "next/link";
import { LockIcon } from "@/components/ui/icons";

// Section verrouillée pour un coach Essentiel : ce que fait la fonctionnalité
// Pro, et un seul bouton « Passer en Pro ». Sans hook : utilisable côté
// serveur comme côté client, les textes arrivent déjà traduits.
export default function ProLock({
  title,
  desc,
  cta,
  className = "",
}: {
  title: string;
  desc: string;
  cta: string;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-2xl border border-dashed border-accent/30 bg-accent/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-bg-elevated text-accent"
        >
          <LockIcon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-base">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{desc}</p>
        </div>
      </div>
      <Link
        href="/dashboard/abonnement"
        className="shrink-0 rounded-full bg-accent px-4 py-2 text-center text-xs font-semibold text-black transition-opacity hover:opacity-90"
      >
        {cta}
      </Link>
    </section>
  );
}
