"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Ligne « Tu es coach ? » du teaser d'annuaire. Selon qui regarde :
// - visiteur : inscription coach ;
// - coach connecté : sa page existe déjà, retour à son espace ;
// - client connecté sans profil coach : rien, un client n'a pas à se voir
//   proposer de devenir coach.
type Who = "loading" | "anon" | "coach" | "client";

export default function DirectoryCoachCta({
  hint,
  cta,
  existing,
  open,
}: {
  hint: string;
  cta: string;
  existing: string;
  open: string;
}) {
  const [who, setWho] = useState<Who>("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (alive) setWho("anon");
        return;
      }
      const { data: coachRow } = await supabase
        .from("coaches")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (alive) setWho(coachRow ? "coach" : "client");
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (who === "loading" || who === "client") return null;

  const linkCls =
    "font-semibold text-text-base underline underline-offset-4 transition-colors hover:text-accent";

  if (who === "coach") {
    return (
      <p className="mt-8 text-sm text-text-dim">
        {existing}{" "}
        <Link href="/dashboard" className={linkCls}>
          {open}
        </Link>
      </p>
    );
  }

  return (
    <p className="mt-8 text-sm text-text-dim">
      {hint}{" "}
      <Link href="/signup" className={linkCls}>
        {cta}
      </Link>
    </p>
  );
}
