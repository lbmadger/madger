import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Confirmation d'email et réinitialisation de mot de passe par token_hash,
// vérifié CÔTÉ SERVEUR (verifyOtp). Contrairement au flux PKCE de
// /auth/callback, ce lien fonctionne depuis n'importe quel appareil ou
// navigateur : indispensable, l'email est presque toujours ouvert ailleurs
// que là où l'inscription a été faite. Les gabarits d'emails Supabase
// pointent ici : {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "email";
  // Chemin interne uniquement (anti open redirect).
  const rawRedirect = searchParams.get("redirect") || "";
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "";

  if (tokenHash) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      // Mot de passe oublié : direction le formulaire de nouveau mot de
      // passe (la session de récupération vient d'être posée en cookies).
      if (type === "recovery") {
        return NextResponse.redirect(
          `${origin}${redirect || "/reset-password"}`
        );
      }
      // Confirmation d'inscription : router selon le rôle choisi au signup.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const role = (user?.user_metadata as { role?: string } | null)?.role;
      if (role === "coach" && user) {
        // Idempotent : ignore le conflit si la ligne existe déjà (même
        // logique que /auth/callback pour Google).
        await supabase.from("coaches").insert({ id: user.id });
        return NextResponse.redirect(`${origin}${redirect || "/onboarding"}`);
      }
      return NextResponse.redirect(
        `${origin}${redirect || "/onboarding-client"}`
      );
    }
  }

  // Jeton absent, déjà consommé ou expiré : retour au login (l'utilisateur
  // dont l'email est déjà confirmé peut simplement se connecter).
  return NextResponse.redirect(`${origin}/login`);
}
