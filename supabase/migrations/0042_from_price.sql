-- Prix d'appel du coach sur la marketplace : « à partir de X€ ».
-- On expose dans la vue publique le tarif le plus bas parmi les prestations
-- actives du coach (min price_cents), pour l'afficher sur les cartes sans
-- charger toutes les prestations. Recrée la vue + la RPC de recherche par
-- rayon (le CASCADE supprime cette dernière).

drop view if exists public.public_coaches cascade;
create view public.public_coaches as
  select c.id, c.slug, c.first_name, c.last_name, c.specialty, c.bio,
         c.avatar_url, c.city, c.accepts_online, c.lat, c.lng,
         c.stripe_charges_enabled, c.cancellation_policy, c.booking_mode,
         c.refund_over_24h_pct, c.refund_under_24h_pct,
         c.created_at, c.sport, c.specialties, c.venues, c.gym_name,
         c.rating_avg, c.rating_count,
         (select min(s.price_cents) from public.services s
           where s.coach_id = c.id and s.active = true) as from_price_cents
    from public.coaches c
   where c.listed = true
     and c.slug is not null
     and c.avatar_url is not null
     and c.stripe_charges_enabled = true
     and exists (select 1 from public.services s
                  where s.coach_id = c.id and s.active = true)
     and exists (select 1 from public.availabilities a
                  where a.coach_id = c.id);
grant select on public.public_coaches to anon, authenticated;

-- Recherche par rayon (recréée : le cascade ci-dessus l'a supprimée).
create or replace function public.search_coaches_nearby(
  p_lat         double precision,
  p_lng         double precision,
  p_radius_km   double precision,
  p_online_only boolean default false
) returns setof public.public_coaches
language sql
stable
set search_path = public
as $$
  with candidates as (
    select pc.*,
           6371 * 2 * asin(sqrt(
             power(sin(radians(pc.lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(pc.lat)) *
             power(sin(radians(pc.lng - p_lng) / 2), 2)
           )) as dist_km
      from public.public_coaches pc
     where pc.lat is not null
       and pc.lng is not null
       and (not p_online_only or pc.accepts_online)
       and pc.lat between p_lat - (p_radius_km / 111.0)
                      and p_lat + (p_radius_km / 111.0)
       and pc.lng between p_lng - (p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.087)))
                      and p_lng + (p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.087)))
  )
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, stripe_charges_enabled,
         cancellation_policy, booking_mode,
         refund_over_24h_pct, refund_under_24h_pct, created_at,
         sport, specialties, venues, gym_name, rating_avg, rating_count,
         from_price_cents
    from candidates
   where dist_km <= p_radius_km
   order by dist_km
   limit 60
$$;

grant execute on function public.search_coaches_nearby(
  double precision, double precision, double precision, boolean
) to anon, authenticated;
