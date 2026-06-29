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
    password: {
      len: "Au moins 8 caractères",
      upper: "Une majuscule",
      digit: "Un chiffre",
      special: "Un caractère spécial",
    },
    errors: {
      generic: "Une erreur est survenue. Réessaie.",
      invalidCredentials: "Email ou mot de passe incorrect.",
      passwordWeak: "Le mot de passe ne respecte pas tous les critères.",
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
  clients: {
    title: "Clients",
    add: "Ajouter un client",
    search: "Rechercher un client…",
    count: "client(s)",
    emptyTitle: "Aucun client pour l'instant",
    emptyDesc: "Ajoute ton premier client pour commencer à le suivre.",
    form: {
      title: "Nouveau client",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email",
      phone: "Téléphone",
      notes: "Notes",
      notesPlaceholder: "Objectifs, blessures, préférences…",
      create: "Ajouter",
      creating: "Ajout…",
      cancel: "Annuler",
    },
    detail: {
      back: "Retour aux clients",
      since: "Client depuis",
      contact: "Contact",
      notes: "Notes",
      noNotes: "Aucune note pour ce client.",
      edit: "Modifier",
      save: "Enregistrer",
      saving: "Enregistrement…",
      delete: "Supprimer",
      deleteConfirm: "Supprimer ce client ? Cette action est définitive.",
    },
    errors: {
      generic: "Une erreur est survenue. Réessaie.",
      firstNameRequired: "Le prénom est obligatoire.",
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
    password: {
      len: "At least 8 characters",
      upper: "One uppercase letter",
      digit: "One number",
      special: "One special character",
    },
    errors: {
      generic: "Something went wrong. Please try again.",
      invalidCredentials: "Incorrect email or password.",
      passwordWeak: "Password doesn't meet all the requirements.",
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
  clients: {
    title: "Clients",
    add: "Add a client",
    search: "Search a client…",
    count: "client(s)",
    emptyTitle: "No clients yet",
    emptyDesc: "Add your first client to start tracking them.",
    form: {
      title: "New client",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      notes: "Notes",
      notesPlaceholder: "Goals, injuries, preferences…",
      create: "Add",
      creating: "Adding…",
      cancel: "Cancel",
    },
    detail: {
      back: "Back to clients",
      since: "Client since",
      contact: "Contact",
      notes: "Notes",
      noNotes: "No notes for this client.",
      edit: "Edit",
      save: "Save",
      saving: "Saving…",
      delete: "Delete",
      deleteConfirm: "Delete this client? This cannot be undone.",
    },
    errors: {
      generic: "Something went wrong. Please try again.",
      firstNameRequired: "First name is required.",
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
