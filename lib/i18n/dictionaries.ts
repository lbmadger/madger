import type { Locale } from "./config";

// Dictionnaires de traduction du dashboard. Structure imbriquée résolue par
// chemin pointé via la fonction t() (ex: t("nav.clients")). On garde tout
// dans un seul fichier tant que le volume reste raisonnable ; on découpera
// par module si ça grossit.
//
// Le type Dictionary est dérivé du français : ajouter une clé en FR force
// TypeScript à exiger sa traduction en EN.

const fr = {
  common: {
    appName: "Madger",
    soon: "Bientôt",
    comingSoon: "Bientôt disponible",
    save: "Enregistrer",
    cancel: "Annuler",
    loading: "Chargement…",
  },
  nav: {
    overview: "Vue d'ensemble",
    clients: "Clients",
    schedule: "Agenda",
    payments: "Paiements",
    invoices: "Factures",
    stats: "Statistiques",
    settings: "Réglages",
    publicPage: "Ma page publique",
  },
  topbar: {
    language: "Langue",
    account: "Mon compte",
  },
  overview: {
    title: "Vue d'ensemble",
    greeting: "Bonjour",
    subtitle: "Voici l'état de ton activité aujourd'hui.",
    revenueMonth: "Revenus du mois",
    sessionsWeek: "Séances cette semaine",
    activeClients: "Clients actifs",
    pendingPayments: "Paiements en attente",
    nextSessions: "Prochaines séances",
    noSessions: "Aucune séance planifiée pour le moment.",
    setupTitle: "Termine ta configuration",
    setupSubtitle: "Quelques étapes pour ouvrir tes réservations.",
    setupProfile: "Compléter mon profil & ma page publique",
    setupAvailability: "Définir mes disponibilités",
    setupServices: "Créer mes prestations et forfaits",
    setupStripe: "Connecter Stripe pour encaisser",
  },
};

// Le type contractuel : toute langue doit fournir exactement ces clés.
export type Dictionary = typeof fr;

const en: Dictionary = {
  common: {
    appName: "Madger",
    soon: "Soon",
    comingSoon: "Coming soon",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading…",
  },
  nav: {
    overview: "Overview",
    clients: "Clients",
    schedule: "Schedule",
    payments: "Payments",
    invoices: "Invoices",
    stats: "Statistics",
    settings: "Settings",
    publicPage: "My public page",
  },
  topbar: {
    language: "Language",
    account: "My account",
  },
  overview: {
    title: "Overview",
    greeting: "Hi",
    subtitle: "Here's how your business looks today.",
    revenueMonth: "Revenue this month",
    sessionsWeek: "Sessions this week",
    activeClients: "Active clients",
    pendingPayments: "Pending payments",
    nextSessions: "Upcoming sessions",
    noSessions: "No sessions scheduled yet.",
    setupTitle: "Finish your setup",
    setupSubtitle: "A few steps to open up your bookings.",
    setupProfile: "Complete my profile & public page",
    setupAvailability: "Set my availability",
    setupServices: "Create my services and packages",
    setupStripe: "Connect Stripe to get paid",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { fr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
