"use client";

// Dernier filet : si la mise en page racine elle-même casse, Next n'a plus
// rien pour rendre app/error.tsx. Page autonome, sans dépendance.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: "#0b0b0b", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Un problème est survenu</p>
          <p style={{ color: "#757575", maxWidth: 360, marginBottom: 28 }}>
            Réessaie dans un instant. Si ça se reproduit, écris à contact@madger.app.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ background: "#CBFF03", color: "#000", border: 0, borderRadius: 999, padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
