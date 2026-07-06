-- ═══════════════════════════════════════════════════════════════════════════
-- Madger · Facturation conforme : mentions légales du coach
-- À exécuter dans Supabase → SQL Editor → Run (après 0033).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Champs affichés sur les factures coach → client (obligations françaises) :
-- raison sociale, SIRET, numéro de TVA (vide = franchise en base, mention
-- « TVA non applicable, art. 293 B du CGI » ajoutée automatiquement), adresse.

alter table public.coaches
  add column if not exists business_name   text,
  add column if not exists siret           text,
  add column if not exists vat_number      text,
  add column if not exists billing_address text;
