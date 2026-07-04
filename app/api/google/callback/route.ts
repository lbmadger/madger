import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

// Retour de l'OAuth Google : échange le code contre un refresh token et le
// stocke sur le profil du coach connecté (RLS : sa propre ligne uniquement).
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get("madger_gstate")?.value;
  const back = `${origin}/dashboard/reglages`;

  const res = (suffix: string) => {
    const r = NextResponse.redirect(`${back}?google=${suffix}`);
    r.cookies.set("madger_gstate", "", { maxAge: 0, path: "/" });
    return r;
  };

  if (!googleConfigured() || !code || !state || state !== cookieState) {
    return res("error");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        code,
        grant_type: "authorization_code",
        redirect_uri: `${origin}/api/google/callback`,
      }),
    });
    if (!tokenRes.ok) return res("error");
    const tokens = (await tokenRes.json()) as { refresh_token?: string };
    if (!tokens.refresh_token) return res("error");

    const { error } = await supabase
      .from("coaches")
      .update({
        google_refresh_token: tokens.refresh_token,
        google_connected_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) return res("error");

    return res("connected");
  } catch {
    return res("error");
  }
}
