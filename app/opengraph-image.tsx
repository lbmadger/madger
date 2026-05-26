import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Madger - De la demande client à la facture encaissée";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Logo SVG encodé en base64 pour Satori (img tag)
  const logoSvg = `<svg width="56" height="56" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="7" fill="#111111"/><path d="M 4 26 L 9.5 10 L 15 18.5 L 20.5 9 L 23.5 19 C 25 18.5 26.5 12 27.5 5.5" fill="none" stroke="#CBFF03" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="27.5" cy="5.5" r="1.3" fill="#CBFF03"/></svg>`;
  const logoSrc = `data:image/svg+xml;base64,${btoa(logoSvg)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0A0A0A",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Lueur ambiante haut */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, height: 280,
          background: "linear-gradient(180deg, rgba(203,255,3,0.055) 0%, transparent 100%)",
          display: "flex",
        }} />

        {/* Ligne haut */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent 0%, rgba(203,255,3,0.5) 50%, transparent 100%)",
          display: "flex",
        }} />

        {/* Brackets coins - top left */}
        <div style={{
          position: "absolute", top: 38, left: 46,
          width: 46, height: 46,
          borderTop: "1.5px solid rgba(203,255,3,0.28)",
          borderLeft: "1.5px solid rgba(203,255,3,0.28)",
          display: "flex",
        }} />

        {/* Brackets coins - top right */}
        <div style={{
          position: "absolute", top: 38, right: 46,
          width: 46, height: 46,
          borderTop: "1.5px solid rgba(203,255,3,0.28)",
          borderRight: "1.5px solid rgba(203,255,3,0.28)",
          display: "flex",
        }} />

        {/* Brackets coins - bottom left */}
        <div style={{
          position: "absolute", bottom: 38, left: 46,
          width: 46, height: 46,
          borderBottom: "1.5px solid rgba(203,255,3,0.28)",
          borderLeft: "1.5px solid rgba(203,255,3,0.28)",
          display: "flex",
        }} />

        {/* Brackets coins - bottom right */}
        <div style={{
          position: "absolute", bottom: 38, right: 46,
          width: 46, height: 46,
          borderBottom: "1.5px solid rgba(203,255,3,0.28)",
          borderRight: "1.5px solid rgba(203,255,3,0.28)",
          display: "flex",
        }} />

        {/* Contenu principal centré */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: 110,
          paddingRight: 110,
        }}>

          {/* Logo + nom */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 50,
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 18,
            paddingRight: 24,
            borderRadius: 100,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            {/* Logo SVG réel */}
            <img
              src={logoSrc}
              width={40}
              height={40}
              style={{ display: "block", borderRadius: 10 }}
            />
            <span style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#CBFF03",
              letterSpacing: "-0.03em",
            }}>
              Madger
            </span>
          </div>

          {/* Headline ligne 1 */}
          <div style={{
            fontSize: 74,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.045em",
            lineHeight: 1.03,
            textAlign: "center",
            display: "flex",
          }}>
            De la demande client
          </div>

          {/* Headline ligne 2 vert */}
          <div style={{
            fontSize: 74,
            fontWeight: 900,
            color: "#CBFF03",
            letterSpacing: "-0.045em",
            lineHeight: 1.03,
            textAlign: "center",
            marginBottom: 34,
            display: "flex",
          }}>
            à la facture encaissée.
          </div>

          {/* Sous-titre avec séparateurs */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}>
            <span style={{ fontSize: 18, color: "#333333", letterSpacing: "-0.01em" }}>Réservations</span>
            <span style={{ fontSize: 18, color: "rgba(203,255,3,0.22)" }}>·</span>
            <span style={{ fontSize: 18, color: "#333333", letterSpacing: "-0.01em" }}>Paiements</span>
            <span style={{ fontSize: 18, color: "rgba(203,255,3,0.22)" }}>·</span>
            <span style={{ fontSize: 18, color: "#333333", letterSpacing: "-0.01em" }}>Factures automatiques</span>
          </div>
        </div>

        {/* Barre bas */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 84,
          paddingRight: 84,
          paddingBottom: 46,
        }}>
          <span style={{
            fontSize: 14,
            color: "#262626",
            letterSpacing: "0.05em",
            fontWeight: 500,
          }}>
            madger.app
          </span>

          {/* Badge early access */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 18,
            paddingRight: 18,
            borderRadius: 100,
            background: "rgba(203,255,3,0.06)",
            border: "1px solid rgba(203,255,3,0.22)",
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: 6,
              background: "#CBFF03",
              display: "flex",
            }} />
            <span style={{
              fontSize: 13,
              color: "#CBFF03",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}>
              EARLY ACCESS OUVERT
            </span>
          </div>
        </div>

        {/* Ligne bas */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent 0%, rgba(203,255,3,0.2) 50%, transparent 100%)",
          display: "flex",
        }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
