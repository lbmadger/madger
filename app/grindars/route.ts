import { NextResponse, type NextRequest } from "next/server";
import { LAUNCH_LINK } from "@/lib/subscription/offer";

// madger.app/grindars : lien dédié à la vidéo de Léo Grindars. Même offre de
// lancement, mais la source est mémorisée pour mesurer ce que la vidéo ramène.
export function GET(req: NextRequest) {
  const url = new URL("/signup", req.url);
  url.searchParams.set("offre", LAUNCH_LINK.code);
  url.searchParams.set("src", "grindars");
  return NextResponse.redirect(url);
}
