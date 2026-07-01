import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, getAccessCode } from "@/lib/access";

export const dynamic = "force-dynamic";

// Vérifie le code d'accès pré-lancement et pose le cookie qui déverrouille
// l'app. Le cookie contient le code (verrou vitrine, non sensible).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = (body.code as string | undefined)?.trim();
  if (!code || code !== getAccessCode()) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, getAccessCode(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 jours
  });
  return res;
}
