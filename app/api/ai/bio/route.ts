import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Bio de coach écrite par l'IA (onboarding, retouchable ensuite) : le coach
// donne quelques mots bruts, le serveur renvoie une bio prête à publier.
// Deux fournisseurs possibles, choisis par variable d'environnement Vercel
// (les clés ne vivent QUE côté serveur) :
//   1. ANTHROPIC_API_KEY (payant, qualité maximale) si présente ;
//   2. sinon GEMINI_API_KEY (palier gratuit de Google AI Studio) ;
//   3. sinon 503, et le bouton s'explique côté client.
const SYSTEM = `Tu écris la bio publique d'un coach sportif indépendant pour sa page de réservation.
Règles strictes :
- 60 à 90 mots, en français, à la première personne (« je »).
- Ton chaleureux, direct et professionnel. Tutoie le lecteur.
- Aucun emoji, aucun hashtag, aucun tiret long.
- N'invente JAMAIS de diplôme, de chiffre, d'année d'expérience ou de client qui ne t'a pas été fourni.
- Structure : qui je suis, qui j'accompagne, ce que tu obtiens avec moi, une phrase d'invitation à réserver.
Réponds UNIQUEMENT avec la bio, sans préambule, sans guillemets, sans titre.`;

async function viaAnthropic(prompt: string): Promise<string> {
  const anthropic = new Anthropic();
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.find((b) => b.type === "text")?.text?.trim() ?? "";
}

async function viaGemini(prompt: string): Promise<string> {
  // API REST Gemini (pas de SDK à embarquer). thinkingBudget: 0 : sans lui,
  // les modèles 2.5 dépensent le plafond de tokens en réflexion interne et
  // peuvent renvoyer un texte vide.
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY as string,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 800,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );
  if (!res.ok) return "";
  const data = await res.json().catch(() => null);
  const parts: { text?: string }[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

export async function POST(req: NextRequest) {
  const provider = process.env.ANTHROPIC_API_KEY
    ? "anthropic"
    : process.env.GEMINI_API_KEY
    ? "gemini"
    : null;
  if (!provider) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const notes =
    typeof body?.notes === "string" ? body.notes.trim().slice(0, 600) : "";

  // Contexte du profil (RLS : le coach ne lit que sa propre ligne).
  const { data: coach } = await supabase
    .from("coaches")
    .select("first_name, specialty, city, accepts_online")
    .eq("id", user.id)
    .maybeSingle();

  const facts = [
    coach?.first_name ? `Prénom : ${coach.first_name}` : null,
    coach?.specialty ? `Spécialité : ${coach.specialty}` : null,
    coach?.city ? `Ville : ${coach.city}` : null,
    coach?.accepts_online ? "Propose aussi des séances en visio." : null,
    notes ? `Ce que le coach dit de lui, en vrac : ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const prompt =
    facts ||
    "Aucune information fournie : écris une bio de coach sportif chaleureuse et facile à personnaliser.";

  try {
    const text =
      provider === "anthropic"
        ? await viaAnthropic(prompt)
        : await viaGemini(prompt);
    if (!text) {
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
    return NextResponse.json({ bio: text });
  } catch {
    // Panne ou quota côté API : le coach garde la main, il écrit lui-même.
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
