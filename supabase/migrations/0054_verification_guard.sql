-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Durcissement : le badge « Coach vérifié » n'est plus auto-attribuable
-- À exécuter dans Supabase → SQL Editor → Run (après 0053).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Faille (audit) : 0046 accorde au rôle `authenticated` le droit d'écrire la
-- colonne `verification_status`, et la seule garde était une contrainte CHECK
-- bornant les valeurs à none/pending/verified/rejected. Rien n'empêchait donc
-- un coach de poser lui-même `verification_status = 'verified'` depuis le
-- navigateur (client anon) et d'obtenir le badge « Coach vérifié » sans diplôme.
--
-- Correctif : un trigger BEFORE UPDATE interdit toute transition vers
-- 'verified' ou 'rejected' initiée par un utilisateur connecté (auth.uid() non
-- nul). Seul le service role (admin Madger, cf. /api/admin/verify) — pour
-- lequel auth.uid() est nul — peut accorder ou refuser la vérification. Le
-- coach reste libre de passer à 'pending' (dépôt de diplôme) et de revenir à
-- 'none'/'pending'.

create or replace function public.guard_coach_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status then
    -- auth.uid() non nul ⇒ requête d'un utilisateur connecté (le coach via son
    -- client anon). Le service role n'a pas de JWT utilisateur ⇒ auth.uid()
    -- est nul, et n'est donc pas concerné par cette garde.
    if auth.uid() is not null
       and new.verification_status in ('verified', 'rejected') then
      raise exception
        'verification_status "%" can only be set by Madger staff',
        new.verification_status
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_coach_verification on public.coaches;
create trigger trg_guard_coach_verification
  before update of verification_status on public.coaches
  for each row
  execute function public.guard_coach_verification();
