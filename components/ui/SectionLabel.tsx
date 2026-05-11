import React from "react";

export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2.5 mb-7"
      style={{
        padding: "6px 14px 6px 10px",
        borderRadius: 100,
        background: "rgba(203,255,3,0.05)",
        border: "1px solid rgba(203,255,3,0.18)",
      }}
    >
      <span
        className="glow-dot"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#CBFF03",
          display: "block",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#CBFF03",
          lineHeight: 1,
        }}
      >
        {children}
      </span>
    </div>
  );
}
