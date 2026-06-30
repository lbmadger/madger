-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Prestations publiques — vue des offres affichées sur la fiche coach
-- À exécuter dans Supabase → SQL Editor → Run (après 0003).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Expose au public (rôle anon) les prestations ACTIVES des coachs VISIBLES.
-- Mêmes principes que public_coaches : sélection de colonnes = frontière de
-- sécurité ; on ne révèle rien de sensible.

create or replace view public.public_services as
  select
    s.id,
    s.coach_id,
    s.name,
    s.description,
    s.type,
    s.location,
    s.duration_min,
    s.price_cents,
    s.currency,
    s.pack_size
  from public.services s
  join public.coaches c on c.id = s.coach_id
  where s.active = true and c.listed = true;

grant select on public.public_services to anon, authenticated;
