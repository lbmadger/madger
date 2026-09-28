# Madger

SaaS et marketplace pour coachs sportifs : page publique, réservation et paiement des séances, packs, abonnements, cours collectifs, agenda, messagerie, versements Stripe Connect.

Stack : Next.js 14 (App Router), Supabase (Postgres, Auth, Storage), Stripe (Checkout, Connect), Resend (emails), Vercel (hébergement, région cdg1).

## Démarrer en local

```bash
npm ci
cp .env.example .env.local   # puis renseigner les clés
npm run dev
```

Vérifications avant de pousser :

```bash
./node_modules/.bin/tsc --noEmit -p .
./node_modules/.bin/next lint --max-warnings=0
npm test
npm run build
```

## Variables d'environnement

Toutes sont décrites dans `.env.example` (obligatoires, optionnelles, valeurs de repli). En production elles vivent dans Vercel, Settings puis Environment Variables. La clé service role et la clé secrète Stripe ne sont jamais dans le code ni dans un fichier commité.

## Lancement du site

Avant l'ouverture, le site est verrouillé par un code d'accès (cookie `madger_access`, valeur `APP_ACCESS_CODE`). Deux façons d'ouvrir :

1. Poser `SITE_LAUNCHED=1` dans Vercel et redéployer.
2. Ne rien faire : `lib/launch.ts` ouvre le site de lui-même à la date `LAUNCH_AT` (dimanche 4 octobre 2026, 18h à Paris).

Le middleware, la landing, le sitemap, l'image de partage et les pages de démonstration lisent tous `siteLaunched()`.

## Crons

Vercel Hobby n'accepte que deux crons planifiés (`vercel.json`). Les deux autres tournent sur cron-job.org. Tous exigent l'en-tête `Authorization: Bearer <CRON_SECRET>` et répondent 401 sinon.

| Route | Planificateur | Cadence | Rôle |
| --- | --- | --- | --- |
| `/api/cron/release` | Vercel | tous les jours à 2h UTC | libère les paiements 24 h après la séance, versements, demandes d'avis |
| `/api/cron/reminders` | Vercel | tous les jours à 7h UTC | rappels 24 h, relances, récap hebdo le lundi |
| `/api/cron/reminders-soon` | cron-job.org | toutes les 15 min | rappel 1 h avant la séance |
| `/api/cron/weekly-recap` | cron-job.org | lundi matin | récap hebdo (idempotent, même marqueur que le cron quotidien) |

## Base de données

Le schéma vit dans `supabase/migrations/` (numérotées). Chaque migration est appliquée sur le projet Supabase puis vérifiée en base. Règles : RLS sur toutes les tables, grants par colonne pour toute colonne écrite depuis le navigateur, colonnes sensibles écrites par le serveur uniquement (service role).

## Webhooks Stripe

`/api/stripe/webhook` vérifie la signature avec `STRIPE_WEBHOOK_SECRET`, et accepte un second secret `STRIPE_CONNECT_WEBHOOK_SECRET` pour un éventuel endpoint « comptes connectés » (`account.updated`). Sans ce second endpoint, l'état Stripe du coach est rafraîchi à l'affichage du dashboard.

## Emails

Gabarits dans `lib/email/templates.ts` (français, tutoiement, anglais pour les coachs en locale `en`). Les champs saisis par les utilisateurs sont échappés avant insertion dans le HTML. Envoi via Resend (`lib/email/resend.ts`).
