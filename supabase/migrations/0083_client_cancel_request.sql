-- Annulation « à la demande du client » déclarée par le coach : ce n'est plus
-- une annulation immédiate avec retenue, mais une DEMANDE que le client
-- confirme (formule appliquée à l'heure de la demande) ou refuse (séance
-- maintenue). Sans ça, un coach pouvait déclarer une annulation client et
-- garder l'argent. Écrit côté serveur uniquement (service role).
alter table public.bookings
  add column if not exists client_cancel_requested_at timestamptz;
