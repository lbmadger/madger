import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

// Démarre la connexion Google du coach (OAuth). Le scope se limite aux
// événements d'agenda (création des séances + liens Meet). access_type
// offline + prompt consent garantissent un refresh token durable.
export async function GET(req: NextRequest) {
  const { origin } = new URL(req.url);

  if (!googleConfigured()) {
    return NextResponse.redirect(
      `${origin}/dashboard/reglages?google=notconfigured`
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Anti-CSRF : jeton aléatoire posé en cookie, revérifié au callback.
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${origin}/api/google/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
  res.cookies.set("madger_gstate", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
