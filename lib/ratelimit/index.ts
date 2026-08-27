import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/config";

// ─────────────────────────────────────────────────────────────────────────
// Rate limiting partagé (persistant en base).
//
// Le limiteur « en mémoire » (une Map par instance) ne tient pas sur du
// serverless : chaque lambda Vercel a sa propre Map, donc un attaquant qui
// répartit ses requêtes entre instances passe à travers. Ce helper compte les
// hits dans Postgres (RPC atomique `rate_limit_hit`), commun à toutes les
// instances. En cas d'indisponibilité de la base, on retombe sur un limiteur
// mémoire (best-effort) pour ne jamais bloquer complètement un endpoint.
// ─────────────────────────────────────────────────────────────────────────

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// Repli mémoire (par instance) — utilisé seulement si le RPC échoue.
const mem = new Map<string, { count: number; start: number }>();
function memAllowed(id: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const e = mem.get(id);
  if (!e || now - e.start > windowMs) {
    mem.set(id, { count: 1, start: now });
    return true;
  }
  e.count += 1;
  return e.count <= max;
}

type Options = {
  bucket: string; // famille de limite, ex. "reviews"
  key: string; // clé (IP, email…) dans cette famille
  max: number; // hits autorisés dans la fenêtre
  windowSeconds: number; // taille de la fenêtre
};

// Renvoie true si la requête est AUTORISÉE, false si elle est plafonnée.
export async function rateLimit({
  bucket,
  key,
  max,
  windowSeconds,
}: Options): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      const supabase = createClient(SUPABASE_URL, serviceKey, {
        auth: { persistSession: false },
      });
      const { data, error } = await supabase.rpc("rate_limit_hit", {
        p_bucket: bucket,
        p_key: key,
        p_max: max,
        p_window_seconds: windowSeconds,
      });
      if (!error && typeof data === "boolean") return data;
    } catch {
      /* repli mémoire ci-dessous */
    }
  }
  return memAllowed(`${bucket}:${key}`, max, windowSeconds * 1000);
}
