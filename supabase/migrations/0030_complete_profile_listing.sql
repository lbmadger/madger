-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Marketplace : seuls les profils COMPLETS sont visibles
-- À exécuter dans Supabase → SQL Editor → Run (après 0029).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un coach n'apparaît sur « Trouve ton coach » (et sa page publique ne
-- s'ouvre) que lorsque son profil est réservable de bout en bout :
-- photo + au moins une prestation active + disponibilités + Stripe actif.
-- La checklist du dashboard et les conseils de Leia guident jusqu'à ces
-- quatre conditions.

drop view if exists public.public_coaches cascade;
create view public.public_coaches as
  select c.id, c.slug, c.first_name, c.last_name, c.specialty, c.bio,
         c.avatar_url, c.city, c.accepts_online, c.lat, c.lng,
         c.stripe_charges_enabled, c.cancellation_policy, c.booking_mode,
         c.created_at, c.sport, c.specialties, c.venues, c.gym_name,
         (select round(avg(r.rating)::numeric, 1)
            from public.reviews r where r.coach_id = c.id) as rating_avg,
         (select count(*)::int
            from public.reviews r where r.coach_id = c.id) as rating_count
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

-- La fonction de recherche par rayon dépend de la vue : on la recrée
-- (identique à 0025, le cascade ci-dessus l'a supprimée).
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
