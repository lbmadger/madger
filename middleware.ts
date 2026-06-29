import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Middleware racine. Le `matcher` ci-dessous le restreint AU SEUL espace
// /dashboard : la landing ("/", "/cgu", etc.) n'est jamais interceptée, donc
// aucun impact sur le site en production.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Strictement les espaces privés : la landing n'est jamais interceptée.
  matcher: ["/dashboard/:path*", "/onboarding"],
};
