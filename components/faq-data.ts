import { FEE_RATE_BPS } from "@/lib/subscription/plan";
import {
  LAUNCH_LINK,
  currentAnnualCents,
  currentMonthlyCents,
  euros,
  launchLinkActive,
  launchLinkDeadlineLabel,
  launchLinkMonthlyCents,
} from "@/lib/subscription/offer";
import { LAUNCH_LABEL } from "@/lib/launch";

// Données FAQ partagées entre le composant FAQ (affichage) et le JSON-LD
// FAQPage généré côté serveur dans app/page.tsx (rich snippets Google).
// La première question dépend du mode du site : avant l'ouverture elle donne
// la date et l'accès anticipé, après (SITE_LAUNCHED=1 ou heure passée) elle
// explique comment démarrer.
export function getFaqs(launched: boolean) {
  const faqs = baseFaqs();
  if (!launched) return faqs;
  return [
    {
      q: "Comment démarrer avec Madger ?",
      a: "Tu crées ton compte gratuitement, tu configures ta page en quelques minutes (prestations, disponibilités, paiement) et tu partages ton lien. Le plan Essentiel suffit pour démarrer. Envie du Pro ? Tu l'essaies 7 jours gratuitement : tu enregistres ta carte, rien n'est débité pendant l'essai, et tu arrêtes quand tu veux depuis ton abonnement.",
    },
    ...faqs.slice(1),
  ];
}

// Fonction et non constante : les prix du Pro viennent de currentMonthlyCents()
// et currentAnnualCents(), et la question sur l'offre de lancement disparaît
// d'elle-même à la date limite. Jamais de montant en dur figé au build.
export function baseFaqs() {
  const monthly = euros(currentMonthlyCents());
  const annual = euros(currentAnnualCents());
  const essentialPct = FEE_RATE_BPS.essential / 100;
  const proPct = FEE_RATE_BPS.pro / 100;

  const faqs: { q: string; a: string }[] = [
    {
      q: "Quand Madger sera-t-il disponible ?",
      a: `Madger ouvre à tous ${LAUNCH_LABEL}. En attendant, tu peux rejoindre l'accès anticipé : les premiers membres fondateurs reçoivent le plan Pro offert pendant 1 mois dès l'ouverture, et tu es prévenu par email dès que ton accès est prêt. Les places fondateurs sont limitées : une fois complètes, tu passes en liste d'attente prioritaire.`,
    },
    {
      q: "Comment fonctionne le lien coach ?",
      a: "Tu obtiens une page personnalisée à ton nom, par exemple madger.app/emma. Tu la partages en bio Instagram, en signature d'email, partout. Tes clients y voient tes prestations, choisissent leur créneau et paient directement. Aucune installation, aucun site à construire.",
    },
    {
      q: "Mes clients doivent-ils créer un compte ?",
      a: "Oui, un compte créé en 30 secondes au moment de réserver. Il leur sert ensuite à tout retrouver au même endroit : leurs séances, le lien visio, leurs factures, l'annulation en un clic et la messagerie avec toi. Confirmation et facture arrivent aussi par email.",
    },
    {
      q: "Madger est-il adapté à mon type de coaching ?",
      a: "Oui. Madger est pensé d'abord pour les coachs sportifs et préparateurs physiques, mais il s'adapte à toutes les formes de coaching individuel (bien-être, développement personnel, business). En présentiel, en salle, en extérieur, en visio ou les deux.",
    },
    {
      q: "Comment fonctionne le paiement ?",
      a: "Ton client règle en ligne au moment où il réserve, par carte, Apple Pay ou Google Pay via Stripe. Les fonds sont sécurisés par Stripe, libérés 24 heures après la séance, puis virés sur ton compte bancaire chaque semaine, déduction faite des frais de transaction Madger. Si tu valides chaque demande à la main, la carte du client n'est débitée qu'au moment où tu acceptes. Fini les relances.",
    },
    {
      q: "Combien ça coûte si je ne vends rien ?",
      a: `Rien. Le plan Essentiel n'a ni abonnement ni minimum : 0 € tant que tu n'encaisses pas, puis ${essentialPct} % de frais de transaction sur chaque séance vendue, tout compris (paiement par carte, Apple Pay, remboursements et litiges). Pro, à ${monthly} par mois et ${proPct} %, ajoute l'annulation automatique selon tes règles, les relances de renouvellement, l'écran encaissements, l'alerte clients qui décrochent et les statistiques avancées : tu l'essaies 7 jours sans être débité.`,
    },
  ];

  // Tant que l'offre de lancement court : -50 % sur le Pro mensuel pendant
  // trois mois pour tout compte créé avant la date limite.
  if (launchLinkActive()) {
    faqs.push({
      q: "C'est quoi l'offre de lancement ?",
      a: `Si tu crées ton compte avant le ${launchLinkDeadlineLabel("fr")}, ton premier abonnement Pro mensuel est à ${euros(launchLinkMonthlyCents())} par mois pendant ${LAUNCH_LINK.months} mois au lieu de ${monthly}, puis ${monthly} par mois, sans engagement. La remise s'applique toute seule au paiement, sans code. Les 7 jours d'essai gratuits restent valables, et l'annuel reste à ${annual} par an avec 2 mois offerts.`,
    });
  }

  faqs.push(
    {
      q: "Puis-je arrêter mon abonnement Pro quand je veux ?",
      a: "Oui, sans engagement. Tu résilies en un clic depuis ton abonnement : le Pro reste actif jusqu'à la fin de la période déjà payée, puis tu repasses automatiquement en Essentiel. Ta page, tes clients, tes réservations et tes factures restent en place, tu ne perds rien.",
    },
    {
      q: "Mes données et celles de mes clients sont-elles sécurisées ?",
      a: "Toutes les données sont hébergées en Europe. Les paiements transitent via Stripe, certifié PCI-DSS niveau 1, le standard de sécurité le plus élevé. Nous ne revendons aucune donnée. Tu gardes le contrôle total.",
    },
    {
      q: "Suis-je prêt pour la facturation électronique obligatoire ?",
      a: "Oui. Chaque séance encaissée génère une facture numérotée avec tes mentions légales (SIRET, TVA), Madger t'adresse une facture mensuelle pour ses frais de transaction, et ta comptabilité s'exporte en un clic pour ton expert-comptable. Tes factures portent déjà toutes les mentions obligatoires, sont numérotées sans trou et conservées dans ton espace. Le format Factur-X prévu par la réforme sera proposé quand le calendrier l'exigera pour ton statut.",
    },
    {
      q: "Comment Madger supprime-t-il les no-shows ?",
      a: "Ton client paie au moment où il réserve : la séance est payée avant d'être donnée. S'il annule, ta politique d'annulation s'applique automatiquement, sans discussion. En Essentiel, la règle est simple : remboursé s'il annule plus de 24 heures avant, rien en dessous. En Pro, tu choisis ton délai (12, 24 ou 48 heures) et tes pourcentages de remboursement. Un rappel la veille et un autre une heure avant suppriment l'oubli.",
    },
    {
      q: "Puis-je donner mes séances en visio ?",
      a: "Oui. Chaque prestation se donne en présentiel (ta salle, un parc, chez le client) ou en visio. Si tu connectes ton Google Calendar, un lien Google Meet est créé automatiquement pour chaque séance en visio et envoyé à ton client dans sa confirmation et ses rappels. Chaque réservation s'ajoute aussi automatiquement à ton agenda Google.",
    },
    {
      q: "Puis-je gérer plusieurs types de séances ?",
      a: "Oui. Tu crées autant de prestations que tu veux : séance découverte, coaching individuel, suivi mensuel, pack de séances, cours collectif avec un nombre de places. Chaque prestation a son tarif, sa durée et ses disponibilités. Sur les packs à partir de 120 €, tu peux proposer le paiement en 3 fois.",
    },
    {
      q: "Mes clients peuvent-ils me trouver sur Madger ?",
      a: "Oui. En plus de ton lien, ton profil apparaît dans l'annuaire des coachs sur madger.app/coachs, avec ta ville, tes spécialités et tes avis. Seuls les clients qui ont réellement payé une séance peuvent laisser un avis. Tu peux masquer ton profil de l'annuaire à tout moment, ton lien direct continue de fonctionner.",
    },
    {
      q: "Quelle application choisir quand on est coach sportif ?",
      a: "Celle qui te fait payer pour chaque séance sans courir après tes clients. Une application pour coach sportif doit au minimum offrir un lien de réservation, le paiement en ligne au moment de la réservation, une politique d'annulation appliquée toute seule et la facture envoyée sans intervention. Madger fait tout ça en un seul lien, sans site à construire.",
    }
  );

  return faqs;
}
