-- Verrou d'exécution du fulfillment Stripe : le webhook checkout.session.completed
-- et le retour navigateur (/api/stripe/checkout/success) arrivent souvent dans la
-- même seconde. Sans verrou, chacun passe l'anti-doublon (aucun paiement encore
-- écrit), le second voit la séance que le premier vient de créer, la prend pour
-- celle d'un autre client et annule le paiement (« créneau pris »). Le premier
-- qui insère la session travaille ; l'autre attend la ligne de paiement.
-- Service role uniquement : RLS active sans politique.
create table if not exists public.checkout_fulfillments (
  session_id text primary key,
  created_at timestamptz not null default now()
);
alter table public.checkout_fulfillments enable row level security;
revoke all on public.checkout_fulfillments from anon, authenticated;
