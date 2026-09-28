-- Audit de lancement : deux surfaces d'écriture trop larges.
--
-- 1. bookings : le rôle authenticated avait UPDATE sur toutes les colonnes
--    (RLS par ligne seulement). Un coach pouvait, par un appel PostgREST
--    direct, passer une séance payée en « cancelled » sans remboursement, ou
--    poser client_cancel_requested_at et laisser le cron appliquer sa formule.
--    Règle du projet : grant par colonne pour tout ce qui est écrit depuis le
--    navigateur. L'agenda n'édite que le client, la prestation, l'horaire, le
--    lieu, le lien visio et les notes. Le statut, les crédits, les demandes
--    d'annulation et les rappels sont réservés au serveur (service role).
revoke update on public.bookings from anon, authenticated;
grant update (client_id, service_id, starts_at, ends_at, location, location_text, meeting_url, notes)
  on public.bookings to authenticated;
-- Le rôle anon n'écrit jamais dans bookings (le tunnel public passe par des
-- fonctions et le service role) ; la RLS l'interdisait déjà, les grants suivent.
revoke insert on public.bookings from anon;

-- 2. request_booking (demande de séance gratuite) : SECURITY DEFINER exécutable
--    par anon via /rest/v1/rpc, sans le contrôle « paiement obligatoire » que
--    seule la route /api/booking-request applique. La route l'appelle désormais
--    avec le service role après ses contrôles (limite de débit, honeypot,
--    paiement obligatoire).
revoke execute on function public.request_booking(text, text, text, text, text, timestamptz, integer, text, boolean)
  from public, anon, authenticated;
