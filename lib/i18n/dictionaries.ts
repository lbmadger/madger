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
  auth: {
    emailLabel: "Adresse email",
    passwordLabel: "Mot de passe",
    or: "ou",
    googleContinue: "Continuer avec Google",
    signingIn: "Connexion…",
    login: {
      title: "Connexion à Madger",
      subtitle: "Ravi de te revoir. Connecte-toi pour gérer ton activité.",
      submit: "Se connecter",
      noAccount: "Pas encore de compte ?",
      link: "Créer un compte",
    },
    signup: {
      title: "Créer ton compte coach",
      subtitle: "Quelques secondes pour démarrer avec Madger.",
      submit: "Créer mon compte",
      haveAccount: "Tu as déjà un compte ?",
      link: "Se connecter",
      checkEmailTitle: "Vérifie ta boîte mail",
      checkEmailDesc:
        "On t'a envoyé un lien de confirmation. Clique dessus pour activer ton compte.",
    },
    errors: {
      generic: "Une erreur est survenue. Réessaie.",
      invalidCredentials: "Email ou mot de passe incorrect.",
      passwordTooShort: "Le mot de passe doit faire au moins 8 caractères.",
    },
  },
  account: {
    signout: "Se déconnecter",
  },
  onboarding: {
    title: "Bienvenue sur Madger 👋",
    subtitle: "Crée ton profil pour générer ton lien de réservation.",
    firstName: "Prénom",
    lastName: "Nom",
    specialty: "Spécialité",
    specialtyPlaceholder: "Ex : Coach sportif, prépa physique, yoga…",
    slugLabel: "Ton lien public",
    slugHint: "Lettres minuscules, chiffres et tirets uniquement.",
    submit: "Créer mon profil",
    saving: "Création…",
    errors: {
      generic: "Une erreur est survenue. Réessaie.",
      slugTaken: "Ce lien est déjà pris, choisis-en un autre.",
      slugInvalid: "Lien invalide (lettres minuscules, chiffres et tirets).",
      nameRequired: "Indique au moins ton prénom.",
    },
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
  auth: {
    emailLabel: "Email address",
    passwordLabel: "Password",
    or: "or",
    googleContinue: "Continue with Google",
    signingIn: "Signing in…",
    login: {
      title: "Sign in to Madger",
      subtitle: "Welcome back. Sign in to manage your business.",
      submit: "Sign in",
      noAccount: "No account yet?",
      link: "Create an account",
    },
    signup: {
      title: "Create your coach account",
      subtitle: "A few seconds to get started with Madger.",
      submit: "Create my account",
      haveAccount: "Already have an account?",
      link: "Sign in",
      checkEmailTitle: "Check your inbox",
      checkEmailDesc:
        "We sent you a confirmation link. Click it to activate your account.",
    },
    errors: {
      generic: "Something went wrong. Please try again.",
      invalidCredentials: "Incorrect email or password.",
      passwordTooShort: "Password must be at least 8 characters.",
    },
  },
  account: {
    signout: "Sign out",
  },
  onboarding: {
    title: "Welcome to Madger 👋",
    subtitle: "Set up your profile to generate your booking link.",
    firstName: "First name",
    lastName: "Last name",
    specialty: "Specialty",
    specialtyPlaceholder: "E.g. Personal trainer, strength coach, yoga…",
    slugLabel: "Your public link",
    slugHint: "Lowercase letters, numbers and hyphens only.",
    submit: "Create my profile",
    saving: "Saving…",
    errors: {
      generic: "Something went wrong. Please try again.",
      slugTaken: "This link is already taken, pick another one.",
      slugInvalid: "Invalid link (lowercase letters, numbers and hyphens).",
      nameRequired: "Please enter at least your first name.",
    },
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
