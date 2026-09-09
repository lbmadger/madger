// Données FAQ partagées entre le composant FAQ (affichage) et le JSON-LD
// FAQPage généré côté serveur dans app/page.tsx (rich snippets Google).
// La première question dépend du mode du site : avant le lancement elle parle
// de l'accès anticipé, après (SITE_LAUNCHED=1) elle explique comment démarrer.
export function getFaqs(launched: boolean) {
  if (!launched) return faqs;
  return [
    {
      q: "Comment démarrer avec Madger ?",
      a: "Tu crées ton compte gratuitement, tu configures ta page en quelques minutes (prestations, disponibilités, paiement) et tu partages ton lien. Le plan Essentiel suffit pour démarrer. Envie du Pro ? Tu l'essaies 7 jours gratuitement : tu enregistres ta carte, rien n'est débité pendant l'essai, et tu arrêtes quand tu veux depuis ton abonnement.",
    },
    ...faqs.slice(1),
  ];
}

export const faqs = [
  {
    q: "Quand Madger sera-t-il disponible ?",
    a: "Madger est en phase d'accès anticipé. Les coachs qui s'inscrivent maintenant sont sélectionnés manuellement et accèdent en priorité au lancement, avec le plan Pro offert pendant 1 mois. On te contacte directement dès que ton accès est prêt.",
  },
  {
    q: "Comment fonctionne le lien coach ?",
    a: "Tu obtiens une page personnalisée à ton nom, par exemple madger.app/emma. Tu la partages en bio Instagram, en signature d'email, partout. Tes clients y voient tes prestations, choisissent leur créneau et paient directement. Aucune installation, aucune friction.",
  },
  {
    q: "Mes clients doivent-ils créer un compte ?",
    a: "Oui, un compte créé en 30 secondes au moment de réserver. Il leur sert ensuite à tout retrouver au même endroit : leurs séances, le lien visio, leurs factures, l'annulation en un clic et la messagerie avec toi. Confirmation et facture arrivent aussi par email.",
  },
  {
    q: "Madger est-il adapté à mon type de coaching ?",
    a: "Oui. Madger est pensé d'abord pour les coachs sportifs et préparateurs physiques, mais il s'adapte à toutes les formes de coaching individuel (bien-être, développement personnel, business). En présentiel, en visio ou les deux.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Ton client règle en ligne au moment où il réserve, par carte, Apple Pay ou Google Pay via Stripe. Les fonds sont sécurisés par Stripe, libérés 24 heures après la séance, puis virés sur ton compte bancaire chaque semaine, déduction faite des frais de transaction Madger. Si tu valides chaque demande à la main, la carte du client n'est débitée qu'au moment où tu acceptes. Fini les relances.",
  },
  {
    q: "Combien ça coûte si je ne vends rien ?",
    a: "Rien. Le plan Essentiel n'a ni abonnement ni minimum : 0 € tant que tu n'encaisses pas, puis 7 % de frais de transaction sur chaque séance vendue, tout compris (paiement par carte, Apple Pay, remboursements et litiges). Pro, à 49 € par mois et 3 %, ajoute l'annulation automatique selon tes règles, les relances, l'écran encaissements, les alertes clients qui décrochent et les statistiques avancées : tu l'essaies 7 jours sans être débité.",
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
    q: "Puis-je gérer plusieurs types de séances ?",
    a: "Oui. Tu crées autant de prestations que tu veux : séance découverte, coaching individuel, suivi mensuel, pack séances… Chaque prestation a son tarif, sa durée et ses disponibilités. Tes clients voient tout et choisissent ce qui leur convient.",
  },
];
