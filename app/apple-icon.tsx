import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const logoSvg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="180" height="180" rx="40" fill="#111111"/><path d="M 22 146 L 53 56 L 84 104 L 115 50 L 132 107 C 140 104 149 67 155 31" fill="none" stroke="#CBFF03" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><circle cx="155" cy="31" r="7.3" fill="#CBFF03"/></svg>`;
  const logoSrc = `data:image/svg+xml;base64,${btoa(logoSvg)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          borderRadius: 40,
        }}
      >
        <img src={logoSrc} alt="" width={180} height={180} style={{ display: "block" }} />
      </div>
    ),
    { width: 180, height: 180 }
  );
}
