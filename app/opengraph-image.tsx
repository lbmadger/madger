import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Madger — De la demande client à la facture encaissée";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 220,
            right: 220,
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(203,255,3,0.55) 50%, transparent 100%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#111111",
              border: "1.5px solid rgba(203,255,3,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              color: "#CBFF03",
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: 38,
              fontWeight: 900,
              color: "#CBFF03",
              letterSpacing: "-0.04em",
            }}
          >
            Madger
          </span>
        </div>

        {/* Headline ligne 1 */}
        <div
          style={{
            fontSize: 70,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.04em",
            lineHeight: 1.04,
            textAlign: "center",
            display: "flex",
          }}
        >
          De la demande client
        </div>

        {/* Headline ligne 2 en vert */}
        <div
          style={{
            fontSize: 70,
            fontWeight: 900,
            color: "#CBFF03",
            letterSpacing: "-0.04em",
            lineHeight: 1.04,
            textAlign: "center",
            marginBottom: 30,
            display: "flex",
          }}
        >
          à la facture encaissée.
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#4A4A4A",
            textAlign: "center",
            letterSpacing: "-0.01em",
            display: "flex",
          }}
        >
          Réservations · Paiements · Factures — automatiquement
        </div>

        {/* Badge bas */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 24px",
            borderRadius: 100,
            background: "rgba(203,255,3,0.07)",
            border: "1px solid rgba(203,255,3,0.24)",
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: 10,
              background: "#CBFF03",
            }}
          />
          <span
            style={{
              fontSize: 16,
              color: "#CBFF03",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            EARLY ACCESS OUVERT
          </span>
        </div>

        {/* Glow bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 220,
            right: 220,
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(203,255,3,0.3) 50%, transparent 100%)",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
