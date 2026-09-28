import { createAdminClient } from "@/lib/supabase/admin";

// Limite de débit DURABLE, partagée entre toutes les instances serverless :
// table rate_limits + fonction rate_limit_hit (SECURITY DEFINER, exécutable
// par le service role uniquement). Les compteurs en mémoire des routes
// restent en première ligne (instantanés, sans requête) ; celui-ci tient
// quand Vercel multiplie les instances ou les redémarre à froid.
// Renvoie true si l'appel est autorisé. En cas d'erreur base : autorisé
// (un incident interne ne doit jamais bloquer un vrai client), tracé.
export async function rateLimitAllowed(
  bucket: string,
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return true;
  const { data, error } = await admin.rpc("rate_limit_hit", {
    p_bucket: bucket,
    p_key: key.slice(0, 200),
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate_limit_hit failed:", error.message);
    return true;
  }
  return data !== false;
}

// Adresse IP du client derrière Vercel (premier x-forwarded-for).
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
