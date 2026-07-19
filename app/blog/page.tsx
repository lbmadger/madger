import type { Metadata } from "next";
import Link from "next/link";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import PublicHeader from "@/components/marketplace/PublicHeader";
import { ALL_POSTS } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog Madger · Conseils pour coachs et sportifs",
  description:
    "Se lancer comme coach sportif, fixer ses tarifs, trouver un bon coach : nos guides pour les coachs indépendants et ceux qui veulent se (re)mettre au sport.",
  alternates: { canonical: "/blog" },
};

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  const { locale, dict } = getServerDictionary();
  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.06] px-3.5 py-1.5 text-xs font-medium text-accent">
              Le blog Madger
            </span>
            <h1 className="mx-auto mt-4 max-w-xl text-3xl font-extrabold tracking-tight text-text-base sm:text-4xl">
              Conseils pour coachs et sportifs
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-text-muted sm:text-base">
              Se lancer, fixer ses tarifs, trouver le bon coach : nos guides
              pratiques, sans blabla.
            </p>
          </header>

          <ul className="mt-10 flex flex-col gap-4">
            {ALL_POSTS.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block rounded-2xl border border-border bg-bg-card p-5 transition-colors hover:border-accent/40 sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-dim">
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">
                      {post.audience === "coach" ? "Pour les coachs" : "Pour se remettre au sport"}
                    </span>
                    <span>{dateLabel(post.date)}</span>
                    <span>·</span>
                    <span>{post.readingMinutes} min de lecture</span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold tracking-tight text-text-base sm:text-xl">
                    {post.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                    {post.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent">
                    Lire l'article
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </I18nProvider>
  );
}
