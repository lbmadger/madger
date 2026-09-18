import { NextResponse, type NextRequest } from "next/server";
import { LAUNCH_LINK } from "@/lib/subscription/offer";

// madger.app/lancement : l'adresse courte des stories et des messages.
// Envoie sur l'inscription coach avec le code de l'offre de lancement.
export function GET(req: NextRequest) {
  const url = new URL("/signup", req.url);
  url.searchParams.set("offre", LAUNCH_LINK.code);
  return NextResponse.redirect(url);
}
