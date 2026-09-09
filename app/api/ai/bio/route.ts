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
//   3. sinon (ou si tout échoue) une bio de départ écrite depuis le profil,
//      signalée comme telle au coach.
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

// Modèles Gemini essayés dans l'ordre : celui de GEMINI_MODEL (Vercel) puis
// les repli connus. Google retire régulièrement les anciens (404 « no longer
// available to new users ») : on ne dépend plus d'un seul identifiant.
const GEMINI_MODELS = Array.from(
  new Set(
    [process.env.GEMINI_MODEL, "gemini-3.6-flash", "gemini-2.5-flash"].filter(
      (m): m is string => !!m
    )
  )
);

async function callGemini(
  model: string,
  prompt: string,
  withThinking: boolean
): Promise<{ text: string; status: number }> {
  // API REST Gemini (pas de SDK à embarquer). thinkingBudget: 0 : sans lui,
  // les modèles avec réflexion dépensent le plafond de tokens en interne et
  // peuvent renvoyer un texte vide. Retiré si le modèle refuse l'option (400).
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
          ...(withThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    }
  );
  if (!res.ok) {
    console.error(
      "ai/bio gemini failed:",
      model,
      withThinking ? "(thinking off)" : "(default)",
      res.status,
      (await res.text().catch(() => "")).slice(0, 300)
    );
    return { text: "", status: res.status };
  }
  const data = await res.json().catch(() => null);
  const parts: { text?: string }[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  return {
    text: parts
      .map((p) => p.text ?? "")
      .join("")
      .trim(),
    status: res.status,
  };
}

async function viaGemini(prompt: string): Promise<string> {
  for (const model of GEMINI_MODELS) {
    const first = await callGemini(model, prompt, true);
    if (first.text) return first.text;
    // Option de réflexion refusée : on réessaie le même modèle sans elle.
    if (first.status === 400) {
      const second = await callGemini(model, prompt, false);
      if (second.text) return second.text;
    }
    // 404 (modèle retiré) ou réponse vide : modèle suivant.
  }
  return "";
}

// Bio de repli, sans IA : construite depuis le profil et les notes du coach.
// Jamais de diplôme, de chiffre ni d'expérience inventés ; juste une base
// propre que le coach retouche. Sert quand aucun fournisseur ne répond
// (crédits épuisés, panne, clé absente) : le bouton donne toujours un texte.
type CoachFacts = {
  first_name?: string | null;
  specialty?: string | null;
  sport?: string | null;
  city?: string | null;
  accepts_online?: boolean | null;
  venues?: string[] | null;
};

function templateBio(c: CoachFacts | null, notes: string): string {
  const who = c?.specialty?.trim() || (c?.sport ? `coach ${c.sport}` : "coach sportif");
  const where = c?.city ? ` à ${c.city}` : "";
  const venues = c?.venues ?? [];
  const places: string[] = [];
  if (venues.includes("coach_gym") || venues.includes("client_gym")) places.push("en salle");
  if (venues.includes("outdoor")) places.push("en extérieur");
  if (venues.includes("home")) places.push("à domicile");
  if (venues.includes("online") || c?.accepts_online) places.push("en visio");
  const placeStr =
    places.length === 0
      ? ""
      : places.length === 1
      ? ` ${places[0]}`
      : ` ${places.slice(0, -1).join(", ")} ou ${places[places.length - 1]}`;
  const intro = c?.first_name
    ? `Je suis ${c.first_name}, ${who}${where}.`
    : `Je suis ${who}${where}.`;
  const parts = [
    intro,
    `J'accompagne celles et ceux qui veulent progresser, retrouver la forme ou se dépasser${placeStr}.`,
    "Chaque séance est construite autour de toi : ton niveau, ton emploi du temps, tes objectifs. Tu gagnes un cadre clair, des progrès que tu vois et un coach qui te suit entre les séances.",
  ];
  const n = notes.replace(/\s+/g, " ").trim();
  if (n && n.length <= 300) parts.push(n.endsWith(".") ? n : `${n}.`);
  parts.push("Réserve ta première séance, on commence cette semaine.");
  return parts.join(" ");
}

export async function POST(req: NextRequest) {
  const providers: ("anthropic" | "gemini")[] = [];
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  if (process.env.GEMINI_API_KEY) providers.push("gemini");

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
    .select("first_name, specialty, sport, city, accepts_online, venues")
    .eq("id", user.id)
    .maybeSingle();

  const facts = [
    coach?.first_name ? `Prénom : ${coach.first_name}` : null,
    coach?.specialty ? `Spécialité : ${coach.specialty}` : null,
    coach?.sport ? `Sport principal : ${coach.sport}` : null,
    coach?.city ? `Ville : ${coach.city}` : null,
    coach?.accepts_online ? "Propose aussi des séances en visio." : null,
    notes ? `Ce que le coach dit de lui, en vrac : ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const prompt =
    facts ||
    "Aucune information fournie : écris une bio de coach sportif chaleureuse et facile à personnaliser.";

  // Chaque fournisseur disponible est essayé à son tour ; la cause de chaque
  // échec part dans les logs Vercel (jamais de clé dedans).
  for (const provider of providers) {
    try {
      const text =
        provider === "anthropic"
          ? await viaAnthropic(prompt)
          : await viaGemini(prompt);
      if (text) return NextResponse.json({ bio: text, provider });
      console.error("ai/bio empty answer from", provider);
    } catch (e) {
      const status = e instanceof Anthropic.APIError ? e.status : undefined;
      console.error(
        "ai/bio failed:",
        provider,
        status ?? "",
        e instanceof Error ? e.message.slice(0, 300) : e
      );
    }
  }

  // Aucun fournisseur (ou tous en panne) : bio de départ depuis le profil.
  console.error("ai/bio fallback template, providers tried:", providers.join(",") || "none");
  return NextResponse.json({
    bio: templateBio(coach as CoachFacts | null, notes),
    provider: "template",
    fallback: true,
  });
}
