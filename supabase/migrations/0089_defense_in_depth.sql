-- 0089 : défense en profondeur et index de clés étrangères.

-- 1. Le rôle anon n'écrit JAMAIS en base : la landing, l'accès anticipé, les
--    demandes de séance passent par le serveur (service role). Les grants
--    hérités des droits par défaut (INSERT/UPDATE/DELETE/TRUNCATE sur toutes
--    les tables) n'étaient neutralisés que par la RLS ; une policy permissive
--    ou un « disable row level security » accidentel aurait ouvert l'écriture
--    anonyme. TRUNCATE n'est pas soumis à la RLS : retiré aussi à
--    authenticated. La lecture (SELECT) n'est pas touchée.
revoke insert, update, delete, truncate, trigger, references on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- 2. Fonctions trigger SECURITY DEFINER : Postgres refuse de les appeler
--    hors trigger, mais leur exécution restait accordée à anon via
--    /rest/v1/rpc. Retirée.
revoke execute on function public.bump_conversation() from public, anon, authenticated;
revoke execute on function public.enforce_pack_limit() from public, anon, authenticated;
revoke execute on function public.guard_coach_verification() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_pack_credit() from public, anon, authenticated;
revoke execute on function public.refresh_coach_rating() from public, anon, authenticated;

-- 3. Index sur les clés étrangères sans index (advisor performance) : les
--    jointures et suppressions en cascade ne balayent plus la table.
create index if not exists coaches_referred_by_idx on public.coaches (referred_by);
create index if not exists services_group_service_id_idx on public.services (group_service_id);
create index if not exists bookings_service_id_idx on public.bookings (service_id);
create index if not exists payments_client_id_idx on public.payments (client_id);
create index if not exists payments_service_id_idx on public.payments (service_id);
create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists invoices_credits_invoice_id_idx on public.invoices (credits_invoice_id);
create index if not exists invoices_pack_credit_id_idx on public.invoices (pack_credit_id);
create index if not exists conversations_client_crm_id_idx on public.conversations (client_crm_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists reviews_booking_id_idx on public.reviews (booking_id);
create index if not exists reviews_client_id_idx on public.reviews (client_id);
create index if not exists pack_credits_service_id_idx on public.pack_credits (service_id);
create index if not exists client_subscriptions_service_id_idx on public.client_subscriptions (service_id);
create index if not exists credit_events_booking_id_idx on public.credit_events (booking_id);
create index if not exists credit_events_client_id_idx on public.credit_events (client_id);
create index if not exists group_sessions_service_id_idx on public.group_sessions (service_id);
