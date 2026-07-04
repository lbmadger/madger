-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Recherche de coachs par rayon, côté base (scalable)
-- À exécuter dans Supabase → SQL Editor → Run (après 0024).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Avant : la marketplace rapatriait jusqu'à 500 coachs dans le navigateur et
-- calculait les distances en JS (faux au-delà de 500 coachs, très lourd).
-- Désormais la base filtre par boîte englobante (indexée) puis distance
-- haversine, et renvoie les 60 plus proches, triés.

create index if not exists coaches_lat_lng_idx
  on public.coaches(lat, lng) where lat is not null;

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
       -- Boîte englobante d'abord (indexable), distance exacte ensuite.
       and pc.lat between p_lat - (p_radius_km / 111.0)
                      and p_lat + (p_radius_km / 111.0)
       and pc.lng between p_lng - (p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.087)))
                      and p_lng + (p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.087)))
  )
  select id, slug, first_name, last_name, specialty, bio, avatar_url,
         city, accepts_online, lat, lng, stripe_charges_enabled,
         cancellation_policy, booking_mode, created_at,
         sport, specialties, venues, gym_name, rating_avg, rating_count
    from candidates
   where dist_km <= p_radius_km
   order by dist_km
   limit 60
$$;

grant execute on function public.search_coaches_nearby(
  double precision, double precision, double precision, boolean
) to anon, authenticated;
