// Contenu du blog Madger. Articles stockés en blocs typés (sans dépendance
// markdown) : sûr, typé, et facile à étendre. Le corps supporte le gras
// (**texte**) et les liens ([texte](/url)) en ligne dans les paragraphes.
//
// Objectif SEO : se positionner sur les recherches longue traîne des coachs
// (offre) et des clients (demande), pour amener du trafic organique gratuit.

export type Block =
  | { t: "h2"; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "quote"; text: string };

export type Post = {
  slug: string;
  title: string;
  description: string;
  // Date de publication (ISO). Sert au tri et aux données structurées.
  date: string;
  readingMinutes: number;
  tags: string[];
  // Audience visée : "coach" (offre) ou "client" (demande).
  audience: "coach" | "client";
  content: Block[];
};

const POSTS: Post[] = [
  {
    slug: "devenir-coach-sportif-independant",
    title: "Devenir coach sportif indépendant : le guide complet 2026",
    description:
      "Diplôme, statut juridique, assurance, tarifs, première clientèle : les étapes concrètes pour te lancer comme coach sportif indépendant en France.",
    date: "2026-07-01",
    readingMinutes: 7,
    tags: ["Se lancer", "Statut", "Diplôme"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Se mettre à son compte comme coach sportif, c'est accessible, mais il y a un ordre à respecter pour ne pas se planter. Voici les étapes concrètes, du diplôme obligatoire à tes premiers clients.",
      },
      { t: "h2", text: "1. Avoir un diplôme (c'est obligatoire)" },
      {
        t: "p",
        text: "En France, encadrer une activité physique contre rémunération sans diplôme est illégal. Il te faut une qualification reconnue et une carte professionnelle d'éducateur sportif.",
      },
      {
        t: "ul",
        items: [
          "**BPJEPS** (mention AF - Activités de la Forme, ou AGFF) : la voie la plus courante.",
          "**DEUST** ou **Licence STAPS** : plus universitaire, ouvre plus de portes.",
          "**CQP ALS** : pour un périmètre plus restreint.",
        ],
      },
      {
        t: "p",
        text: "Une fois diplômé, tu déclares ta carte professionnelle sur le site du ministère des Sports. C'est elle qui te rend légalement habilité à coacher.",
      },
      { t: "h2", text: "2. Choisir ton statut juridique" },
      {
        t: "p",
        text: "Pour démarrer seul, la **micro-entreprise** (auto-entrepreneur) est presque toujours le bon choix : création gratuite en ligne, comptabilité ultra simple, cotisations proportionnelles au chiffre d'affaires. Tu obtiens un **numéro SIRET** sous quelques jours.",
      },
      {
        t: "p",
        text: "Tu passeras à une société (EURL, SASU) plus tard, quand ton chiffre d'affaires dépasse les plafonds de la micro ou que tu veux optimiser tes charges.",
      },
      { t: "h2", text: "3. Souscrire une assurance responsabilité civile pro" },
      {
        t: "p",
        text: "Indispensable : si un client se blesse pendant une séance, ta RC professionnelle te couvre. Elle coûte quelques dizaines d'euros par an et te sera demandée par la plupart des salles.",
      },
      { t: "h2", text: "4. Fixer tes tarifs" },
      {
        t: "p",
        text: "En France, une séance individuelle se situe généralement entre 40 et 70 euros. Ne brade pas : un tarif trop bas envoie un mauvais signal. Propose plutôt des **packs** (10 séances) et un **suivi mensuel** pour lisser tes revenus et fidéliser.",
      },
      {
        t: "p",
        text: "On détaille tout dans notre article [Combien gagne un coach sportif indépendant](/blog/combien-gagne-coach-sportif).",
      },
      { t: "h2", text: "5. Trouver tes premiers clients" },
      {
        t: "ul",
        items: [
          "Ton **réseau proche** : les premiers clients viennent souvent du bouche-à-oreille.",
          "Une **page en ligne** claire, avec tes prestations, tes tarifs et la réservation directe.",
          "Ta présence là où sont tes clients : salle de sport, réseaux sociaux, avis clients.",
        ],
      },
      {
        t: "quote",
        text: "Le plus dur n'est pas de coacher, c'est de gérer : réservations, paiements, factures, relances. C'est exactement ce que Madger automatise pour toi.",
      },
      {
        t: "p",
        text: "Avec Madger, tu crées ta page coach, tu es payé en ligne (sans avancer d'argent), et tes factures sont générées automatiquement. [Crée ta page gratuitement](/signup) et concentre-toi sur le coaching.",
      },
    ],
  },
  {
    slug: "combien-gagne-coach-sportif",
    title: "Combien gagne un coach sportif indépendant en France ?",
    description:
      "Tarifs à la séance, revenus moyens, charges selon le statut : ce que gagne vraiment un coach sportif indépendant, et les leviers pour augmenter tes revenus.",
    date: "2026-07-08",
    readingMinutes: 6,
    tags: ["Revenus", "Tarifs", "Business"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "C'est la question que tout coach se pose avant de se lancer. La réponse honnête : ça dépend surtout du nombre de clients réguliers et de ton modèle de revenus. Décortiquons.",
      },
      { t: "h2", text: "Le tarif d'une séance" },
      {
        t: "p",
        text: "Une séance individuelle se facture en général **40 à 70 euros** en France, davantage à Paris ou pour des coachs très spécialisés (préparation physique, post-blessure, préparation compétition).",
      },
      { t: "h2", text: "Un exemple de calcul" },
      {
        t: "p",
        text: "Imaginons un coach avec 15 clients réguliers, chacun 1 séance par semaine à 55 euros :",
      },
      {
        t: "ul",
        items: [
          "15 séances/semaine × 55 euros = **825 euros/semaine**",
          "Soit environ **3 300 euros/mois** de chiffre d'affaires",
          "En micro-entreprise, après cotisations (~22 %), il reste environ **2 570 euros**",
        ],
      },
      {
        t: "p",
        text: "C'est un ordre de grandeur : certains plafonnent à quelques clients en complément d'un autre emploi, d'autres vivent très bien en dépassant 30 clients réguliers.",
      },
      { t: "h2", text: "Salle de sport ou indépendant ?" },
      {
        t: "p",
        text: "En salle, tu es souvent salarié ou tu reverses une commission importante. En indépendant, tu gardes tout ton chiffre, mais tu gères la prospection, les paiements et l'administratif. Le bon compromis pour beaucoup : rester indépendant et s'appuyer sur des outils qui automatisent la gestion.",
      },
      { t: "h2", text: "Les leviers pour gagner plus" },
      {
        t: "ul",
        items: [
          "**Les packs** : vendre 10 séances d'avance sécurise ta trésorerie et fidélise.",
          "**L'abonnement mensuel** : un revenu récurrent, prévisible, qui change tout.",
          "**Le coaching en ligne** : tu n'es plus limité par la géographie ni par ton agenda physique.",
          "**Les avis clients** : un profil bien noté attire plus de demandes, donc plus de revenus.",
        ],
      },
      {
        t: "quote",
        text: "Le coach qui gagne le mieux sa vie n'est pas forcément le meilleur techniquement : c'est celui qui a un revenu récurrent et un agenda plein.",
      },
      {
        t: "p",
        text: "Madger t'aide sur les trois : packs, abonnements et paiements en ligne intégrés, plus une page publique optimisée pour convertir les visiteurs en clients. [Découvre comment](/signup).",
      },
    ],
  },
  {
    slug: "trouver-bon-coach-sportif",
    title: "Comment trouver un bon coach sportif près de chez toi",
    description:
      "Diplôme, spécialité, tarifs, feeling : les critères pour choisir le bon coach sportif, en salle, à domicile ou en ligne, et réussir tes objectifs.",
    date: "2026-07-15",
    readingMinutes: 5,
    tags: ["Conseils", "Débuter", "Choisir"],
    audience: "client",
    content: [
      {
        t: "p",
        text: "Perdre du poids, prendre du muscle, reprendre le sport après des années : un bon coach change tout. Encore faut-il choisir la bonne personne. Voici les critères qui comptent vraiment.",
      },
      { t: "h2", text: "1. Clarifie ton objectif" },
      {
        t: "p",
        text: "Perte de poids, remise en forme, préparation d'une course, rééducation après blessure : chaque objectif appelle une spécialité différente. Un coach spécialisé dans ton besoin ira plus vite qu'un généraliste.",
      },
      { t: "h2", text: "2. Vérifie le diplôme" },
      {
        t: "p",
        text: "Un vrai coach est **diplômé** (BPJEPS, DEUST, STAPS) et déclaré. Sur Madger, les coachs peuvent afficher un badge **Coach vérifié** : leur diplôme a été contrôlé par notre équipe. C'est un gage de sérieux et de sécurité.",
      },
      { t: "h2", text: "3. En salle, à domicile ou en ligne ?" },
      {
        t: "ul",
        items: [
          "**En salle** : accès au matériel, cadre motivant.",
          "**À domicile** : pratique, sans transport, idéal si tu débutes.",
          "**En ligne** : le plus flexible, souvent moins cher, parfait avec un emploi du temps chargé.",
        ],
      },
      { t: "h2", text: "4. Regarde les avis et le tarif" },
      {
        t: "p",
        text: "Les avis d'autres clients sont le meilleur indicateur. Côté budget, compte 40 à 70 euros la séance, avec des packs souvent plus avantageux. Méfie-toi des tarifs anormalement bas.",
      },
      { t: "h2", text: "5. Fais une première séance" },
      {
        t: "p",
        text: "Le feeling compte autant que la technique. Une première séance te dit tout de suite si le courant passe et si le coach t'écoute vraiment.",
      },
      {
        t: "quote",
        text: "Le meilleur coach, c'est celui avec qui tu as envie de revenir la semaine suivante.",
      },
      {
        t: "p",
        text: "Sur Madger, tu compares les coachs près de chez toi, tu vois leurs tarifs, leurs avis et leurs disponibilités, et tu réserves en ligne en toute sécurité. [Trouve ton coach](/coachs).",
      },
    ],
  },
];

// Tri du plus récent au plus ancien (ordre d'affichage sur l'index).
export const ALL_POSTS: Post[] = [...POSTS].sort((a, b) =>
  a.date < b.date ? 1 : -1
);

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
