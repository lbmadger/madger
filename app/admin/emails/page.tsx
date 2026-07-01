import TestEmailButton from "@/components/admin/TestEmailButton";

export const dynamic = "force-dynamic";

const EMAILS = [
  "Confirmation de réservation (client)",
  "Notification de nouvelle séance (coach)",
  "Rappel J-1 (client)",
  "Remboursement après annulation (client)",
  "Fonds libérés / séance réglée (coach)",
  "Alerte litige (admin)",
];

export default function AdminEmails() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Emails</h1>
      <p className="mt-1 text-sm text-text-muted">
        Envoie un exemplaire de chaque email transactionnel pour vérifier le
        rendu. Nécessite <code className="text-text-base">RESEND_API_KEY</code> sur
        le serveur.
      </p>

      <div className="mt-6 max-w-md">
        <TestEmailButton />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-text-base">
          Emails inclus ({EMAILS.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {EMAILS.map((e) => (
            <li key={e} className="flex items-center gap-2 text-sm text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {e}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
