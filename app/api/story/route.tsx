import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { factOfTheDay } from "@/lib/story/facts";
import { ACCENT, DIM, MUTED, Card, Frame, Kicker, Stars, loadFonts } from "@/lib/story/cards";

export const dynamic = "force-dynamic";

// Cartes story Instagram (1080x1920) générées avec les chiffres du coach
// connecté : sa note, un avis reçu, ses séances du mois, ou le fait sport du
// jour. Chaque carte porte son lien madger.app/slug : le coach fait sa pub,
// Madger gagne en visibilité devant ses clients et les autres coachs.
// JAMAIS d'argent sur ces cartes : un coach ne partage pas ses revenus.

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "rating";

  const { data: coach } = await supabase
    .from("coaches")
    .select("first_name, last_name, slug, rating_avg, rating_count, timezone")
    .eq("id", user.id)
    .maybeSingle();
  if (!coach) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const coachName = [coach.first_name, coach.last_name]
    .filter(Boolean)
    .join(" ");
  const slug = (coach.slug as string | null) ?? null;

  let card: React.ReactNode;

  if (type === "rating") {
    const avg = Number(coach.rating_avg ?? 0);
    const count = Number(coach.rating_count ?? 0);
    if (count < 1) {
      return NextResponse.json({ error: "no_reviews" }, { status: 400 });
    }
    card = (
      <Card>
        <Kicker>Merci à mes clients</Kicker>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            fontFamily: "Grotesk",
          }}
        >
          <div style={{ display: "flex", fontSize: 330, color: "#FFFFFF", lineHeight: 0.9 }}>
            {avg.toLocaleString("fr-FR")}
          </div>
          <div style={{ display: "flex", fontSize: 100, color: DIM, marginBottom: 30 }}>
            /5
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 60 }}>
          <Stars rating={Math.round(avg)} size={86} />
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 44,
            color: MUTED,
            marginTop: 56,
          }}
        >
          {count} avis client{count > 1 ? "s" : ""} · {coachName}
        </div>
      </Card>
    );
  } else if (type === "sessions") {
    // Séances déjà coachées ce mois-ci (les annulations et blocs exclus).
    const tz = (coach.timezone as string | null) || "Europe/Paris";
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("is_block", false)
      .neq("status", "cancelled")
      .not("client_id", "is", null)
      .gte("starts_at", monthStart.toISOString())
      .lte("starts_at", now.toISOString());
    const n = count ?? 0;
    const monthLabel = now.toLocaleDateString("fr-FR", {
      month: "long",
      timeZone: tz,
    });
    card = (
      <Card>
        <Kicker>{monthLabel}</Kicker>
        <div
          style={{
            display: "flex",
            fontFamily: "Grotesk",
            fontSize: 400,
            color: "#FFFFFF",
            lineHeight: 0.9,
          }}
        >
          {n}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Grotesk",
            fontSize: 64,
            color: ACCENT,
            marginTop: 40,
          }}
        >
          séance{n > 1 ? "s" : ""} coachée{n > 1 ? "s" : ""}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 42,
            color: MUTED,
            marginTop: 32,
          }}
        >
          {coachName}
        </div>
      </Card>
    );
  } else if (type === "review") {
    const reviewId = req.nextUrl.searchParams.get("review_id") ?? "";
    const { data: review } = await supabase
      .from("reviews")
      .select("rating, comment, hidden, clients(first_name)")
      .eq("id", reviewId)
      .eq("coach_id", user.id)
      .maybeSingle();
    if (!review || review.hidden) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const cl = Array.isArray(review.clients)
      ? review.clients[0]
      : review.clients;
    const raw = ((review.comment as string | null) ?? "").trim();
    const comment = raw.length > 220 ? raw.slice(0, 217).trimEnd() + "…" : raw;
    card = (
      <Card>
        <Kicker>Avis client</Kicker>
        <Stars rating={review.rating as number} size={78} />
        {comment ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Grotesk",
              fontSize: 66,
              color: "#FFFFFF",
              lineHeight: 1.32,
              marginTop: 70,
              textAlign: "center",
              maxWidth: 860,
            }}
          >
            {`« ${comment} »`}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontFamily: "Grotesk",
              fontSize: 150,
              color: "#FFFFFF",
              marginTop: 70,
            }}
          >
            {review.rating}/5
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: 42,
            color: MUTED,
            marginTop: 60,
          }}
        >
          {(cl?.first_name as string | undefined) ?? "Un client"} · séance avec {coachName}
        </div>
      </Card>
    );
  } else if (type === "fact") {
    const offsetRaw = Number(req.nextUrl.searchParams.get("i") ?? "0");
    const offset = Number.isFinite(offsetRaw) ? Math.trunc(offsetRaw) : 0;
    const fact = factOfTheDay(offset);
    card = (
      <Card>
        <Kicker>{fact.kicker}</Kicker>
        <div
          style={{
            display: "flex",
            fontFamily: "Grotesk",
            fontSize: 74,
            color: "#FFFFFF",
            lineHeight: 1.3,
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          {fact.text}
        </div>
      </Card>
    );
  } else {
    return NextResponse.json({ error: "unknown_type" }, { status: 400 });
  }

  const fonts = await loadFonts();
  return new ImageResponse(<Frame slug={slug}>{card}</Frame>, {
    width: 1080,
    height: 1920,
    fonts,
    headers: {
      "Content-Disposition": 'inline; filename="story-madger.png"',
      "Cache-Control": "no-store",
    },
  });
}
