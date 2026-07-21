-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Objectif mensuel du coach + correctif de droits (vérification)
-- À exécuter dans Supabase → SQL Editor → Run (après 0045).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. CORRECTIF 0044 : le coach doit pouvoir déposer son diplôme ───────────
-- Les UPDATE de coaches sont limités par colonne (0035) ; 0044 a ajouté les
-- colonnes de vérification sans accorder le droit → le dépôt côté coach
-- échouait. On l'accorde ici (le statut verified/rejected reste posé par
-- l'admin via service role ; la contrainte CHECK borne les valeurs).
grant update (verification_status, verification_doc_path,
              verification_submitted_at, verification_note)
  on public.coaches to authenticated;

-- ── 2. Objectif mensuel (revenus + séances), affiché sur le dashboard ───────
alter table public.coaches
  add column if not exists monthly_revenue_goal_cents int,
  add column if not exists monthly_sessions_goal int;

alter table public.coaches drop constraint if exists coaches_goals_chk;
alter table public.coaches
  add constraint coaches_goals_chk check (
    (monthly_revenue_goal_cents is null or monthly_revenue_goal_cents between 0 and 100000000)
    and (monthly_sessions_goal is null or monthly_sessions_goal between 0 and 10000)
  );

grant update (monthly_revenue_goal_cents, monthly_sessions_goal)
  on public.coaches to authenticated;
