import Link from "next/link";
import type { ReactNode } from "react";
import type { Block } from "@/lib/blog/posts";

// Rendu du corps d'un article à partir des blocs typés. Gère le gras
// (**texte**) et les liens ([texte](/url)) en ligne dans les paragraphes et
// les listes. Les liens internes passent par next/link.
const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of Array.from(text.matchAll(INLINE))) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    if (m[1] !== undefined) {
      out.push(
        <strong key={key++} className="font-semibold text-text-base">
          {m[1]}
        </strong>
      );
    } else if (m[2] !== undefined && m[3] !== undefined) {
      const href = m[3];
      const internal = href.startsWith("/");
      out.push(
        internal ? (
          <Link key={key++} href={href} className="text-accent hover:underline">
            {m[2]}
          </Link>
        ) : (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            {m[2]}
          </a>
        )
      );
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function PostBody({ content }: { content: Block[] }) {
  return (
    <div className="flex flex-col gap-5">
      {content.map((b, i) => {
        switch (b.t) {
          case "h2":
            return (
              <h2
                key={i}
                className="mt-4 text-xl font-bold tracking-tight text-text-base sm:text-2xl"
              >
                {b.text}
              </h2>
            );
          case "p":
            return (
              <p key={i} className="text-[15px] leading-relaxed text-text-muted">
                {renderInline(b.text)}
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="flex flex-col gap-2">
                {b.items.map((it, j) => (
                  <li
                    key={j}
                    className="flex gap-2.5 text-[15px] leading-relaxed text-text-muted"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{renderInline(it)}</span>
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-2 border-accent pl-4 text-[15px] italic leading-relaxed text-text-base"
              >
                {b.text}
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
