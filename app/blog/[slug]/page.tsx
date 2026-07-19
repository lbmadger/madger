import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import PublicHeader from "@/components/marketplace/PublicHeader";
import PostBody from "@/components/blog/PostBody";
import { ALL_POSTS, getPost } from "@/lib/blog/posts";

const BASE = "https://madger.app";

export function generateStaticParams() {
  return ALL_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Blog · Madger" };
  const url = `${BASE}/blog/${post.slug}`;
  return {
    title: `${post.title} · Madger`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
    },
    twitter: { card: "summary", title: post.title, description: post.description },
  };
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const { locale, dict } = getServerDictionary();
  const url = `${BASE}/blog/${post.slug}`;

  // Données structurées : l'article + le fil d'Ariane.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "Madger" },
    publisher: { "@type": "Organization", name: "Madger" },
    mainEntityOfPage: url,
    url,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Madger", item: BASE },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  // Le CTA de fin dépend de l'audience de l'article (coach vs client).
  const forCoach = post.audience === "coach";

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <PublicHeader />
        <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-base"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Tous les articles
          </Link>

          <article className="mt-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-dim">
              <span>{dateLabel(post.date)}</span>
              <span>·</span>
              <span>{post.readingMinutes} min de lecture</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-text-base sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-text-muted">
              {post.description}
            </p>

            <div className="mt-8">
              <PostBody content={post.content} />
            </div>
          </article>

          {/* CTA de fin : ramène vers l'inscription coach ou la recherche. */}
          <div className="mt-10 rounded-2xl border border-accent/25 bg-accent/[0.05] p-6 text-center">
            <p className="text-lg font-bold text-text-base">
              {forCoach
                ? "Prêt à te lancer comme coach ?"
                : "Prêt à trouver ton coach ?"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
              {forCoach
                ? "Crée ta page, sois payé en ligne, laisse Madger gérer la paperasse."
                : "Compare les coachs près de chez toi et réserve en ligne, en toute sécurité."}
            </p>
            <Link
              href={forCoach ? "/signup" : "/coachs"}
              className="mt-4 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {forCoach ? "Créer ma page gratuitement" : "Trouver un coach"}
            </Link>
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
