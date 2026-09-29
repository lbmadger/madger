import type { Post } from "./posts";

// Deuxième série d'articles (février à septembre 2026). Même format que
// posts.ts : blocs typés, gras et liens en ligne. Les chiffres cités sont
// des ordres de grandeur connus ou renvoient vers la source officielle,
// jamais des statistiques inventées.
export const MORE_POSTS: Post[] = [
  {
    slug: "fixer-tarifs-coach-sportif",
    title: "Coach sportif : comment fixer tes tarifs sans te brader",
    description:
      "Séance à l'unité, pack, suivi mensuel : la méthode simple pour fixer des tarifs de coach sportif qui te font vivre, avec les fourchettes pratiquées en France.",
    date: "2026-02-03",
    readingMinutes: 6,
    tags: ["Tarifs", "Business"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Le prix est la décision que les coachs prennent le plus vite et regrettent le plus longtemps. Voici comment le fixer une bonne fois, sans te comparer au moins cher du quartier.",
      },
      { t: "h2", text: "Pars de ce dont tu as besoin, pas de ce que font les autres" },
      {
        t: "p",
        text: "Calcule ce que tu veux gagner net par mois, ajoute tes charges (cotisations, assurance, déplacements, matériel, ton outil de gestion), puis divise par le nombre de séances que tu peux réellement donner sans t'épuiser. Un coach à temps plein tient rarement plus de 25 à 30 séances par semaine. Ce chiffre est ton plancher : en dessous, tu travailles à perte.",
      },
      { t: "h2", text: "Les fourchettes pratiquées en France" },
      {
        t: "ul",
        items: [
          "**Séance individuelle** : entre 40 et 70 euros en province, souvent 60 à 90 euros à Paris et dans les grandes métropoles.",
          "**Séance en duo** : 25 à 45 euros par personne, plus rentable pour toi, plus accessible pour eux.",
          "**Cours en petit groupe** (4 à 8) : 15 à 25 euros par personne.",
        ],
      },
      {
        t: "p",
        text: "Ces fourchettes sont larges parce que ta spécialité, ton expérience et ton lieu comptent. Un préparateur physique qui suit des sportifs en compétition ne facture pas comme un coach de remise en forme débutant, et c'est normal.",
      },
      { t: "h2", text: "Trois formules, pas dix" },
      {
        t: "p",
        text: "Une séance à l'unité pour tester, un **pack de 10** avec une remise raisonnable (5 à 10 %, pas 30) pour engager, et un **suivi mensuel** pour les clients réguliers. Trop d'options tuent la décision. Trois formules claires, affichées sur ta page, et le client choisit seul.",
      },
      { t: "h2", text: "Le piège du prix rond trop bas" },
      {
        t: "p",
        text: "Une séance à 30 euros attire des clients qui négocient tout et annulent souvent. Une séance à 60 euros attire des clients qui viennent, parce qu'ils ont investi. Le prix filtre autant qu'il rémunère.",
      },
      { t: "h2", text: "Augmente tes tarifs une fois par an" },
      {
        t: "p",
        text: "Préviens tes clients un mois avant, garde l'ancien prix aux fidèles pendant un trimestre si tu veux, et applique le nouveau tarif à tout nouveau client dès aujourd'hui. Un coach qui n'a pas augmenté depuis trois ans a perdu de l'argent sans s'en rendre compte.",
      },
      {
        t: "quote",
        text: "Ton tarif, c'est le message que tu envoies sur la valeur de ton travail. Choisis-le, ne le subis pas.",
      },
      {
        t: "p",
        text: "Sur Madger, tes formules sont affichées sur ta page, le client paie en ligne au moment de réserver, et tu changes un prix en dix secondes. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "coach-a-domicile-ou-en-salle",
    title: "Coach sportif à domicile ou en salle : lequel choisir ?",
    description:
      "Domicile, salle, extérieur ou visio : les avantages et les limites de chaque option pour choisir le format de coaching qui te fera vraiment tenir.",
    date: "2026-02-14",
    readingMinutes: 5,
    tags: ["Choisir un coach", "Domicile", "Salle"],
    audience: "client",
    content: [
      {
        t: "p",
        text: "Avant de comparer les coachs, choisis le format. Le meilleur programme du monde ne sert à rien si tu ne vas pas aux séances. Voici ce que chaque option implique concrètement.",
      },
      { t: "h2", text: "À domicile : zéro trajet, zéro excuse" },
      {
        t: "p",
        text: "Le coach vient chez toi avec son matériel. C'est le format qui a le meilleur taux de présence, parce qu'il supprime le trajet et le regard des autres. Il coûte un peu plus cher (le déplacement est compris dans le prix) et demande un minimum d'espace : un tapis de deux mètres suffit pour la plupart des séances.",
      },
      { t: "h2", text: "En salle : le matériel et l'ambiance" },
      {
        t: "p",
        text: "Idéal si tu veux progresser en musculation avec des charges, ou si l'énergie d'une salle te motive. Vérifie que ton coach a le droit d'y intervenir (certaines salles réservent le coaching à leur équipe) et que l'abonnement à la salle n'est pas en plus.",
      },
      { t: "h2", text: "En extérieur : gratuit et efficace" },
      {
        t: "p",
        text: "Parc, stade, escaliers : le coaching en extérieur convient très bien à la remise en forme, à la course et au renforcement au poids du corps. Le point faible, c'est la météo : demande au coach comment il gère la pluie (report, visio, séance couverte).",
      },
      { t: "h2", text: "En visio : pour les emplois du temps impossibles" },
      {
        t: "p",
        text: "Le coach te suit en direct par vidéo. Ça marche bien pour le renforcement, la mobilité et le suivi entre deux séances en présentiel. Moins bien pour apprendre un geste technique lourd. On en parle en détail dans [Coaching en visio : est-ce que ça marche vraiment ?](/blog/coaching-en-visio-ca-marche).",
      },
      { t: "h2", text: "La question qui tranche" },
      {
        t: "p",
        text: "Demande-toi où tu seras encore dans trois mois. Si tu détestes les trajets, prends le domicile. Si tu as besoin des autres pour te motiver, prends la salle. Le bon format est celui qui te fait revenir.",
      },
      {
        t: "p",
        text: "Sur Madger, chaque page de coach indique le lieu des séances (salle, domicile, extérieur, visio), le prix et les créneaux libres. [Trouve ton coach](/coachs).",
      },
    ],
  },
  {
    slug: "micro-entreprise-coach-sportif",
    title: "Micro-entreprise pour coach sportif : ce que tu dois déclarer et payer",
    description:
      "Création, déclaration de chiffre d'affaires, cotisations, impôt, plafonds : le fonctionnement de la micro-entreprise expliqué simplement pour un coach sportif.",
    date: "2026-02-25",
    readingMinutes: 6,
    tags: ["Statut", "Administratif"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "La micro-entreprise est le statut de départ de la plupart des coachs indépendants. Elle est simple, mais pas magique : voici ce qu'elle implique, sans jargon.",
      },
      { t: "h2", text: "La création, en ligne et gratuite" },
      {
        t: "p",
        text: "Tout passe par le guichet unique des formalités des entreprises. Tu choisis l'activité (coaching sportif, prestation de services), tu reçois ton numéro SIRET sous quelques jours et tu peux facturer. Aucun capital, aucun expert-comptable obligatoire.",
      },
      { t: "h2", text: "Déclarer ton chiffre d'affaires" },
      {
        t: "p",
        text: "Chaque mois ou chaque trimestre (tu choisis à la création), tu déclares sur le site de l'Urssaf le montant encaissé. Pas le montant facturé : le montant réellement reçu sur ton compte pendant la période. Si tu n'as rien encaissé, tu déclares zéro, mais tu déclares quand même.",
      },
      { t: "h2", text: "Les cotisations sociales" },
      {
        t: "p",
        text: "Elles sont calculées en pourcentage du chiffre d'affaires déclaré, prélevées automatiquement. Le taux est révisé régulièrement : vérifie celui en vigueur sur urssaf.fr plutôt que de te fier à un chiffre lu sur un forum. Retiens surtout la logique : pas d'encaissement, pas de cotisation.",
      },
      { t: "h2", text: "L'impôt sur le revenu" },
      {
        t: "p",
        text: "Deux options. Soit tu déclares ton chiffre d'affaires avec tes revenus et l'administration applique un abattement forfaitaire avant impôt. Soit tu choisis le versement libératoire, un petit pourcentage prélevé en même temps que les cotisations, intéressant seulement si ton taux d'imposition est faible. Fais le calcul une fois, avec le simulateur officiel.",
      },
      { t: "h2", text: "La TVA" },
      {
        t: "p",
        text: "En dessous d'un certain chiffre d'affaires annuel, tu es en franchise en base : tu ne factures pas de TVA et tu écris la mention légale sur tes factures. Au-dessus du seuil, tu deviens redevable. On détaille les conséquences dans [Coach sportif et TVA](/blog/coach-sportif-et-tva).",
      },
      { t: "h2", text: "Ce que la micro ne fait pas" },
      {
        t: "ul",
        items: [
          "Elle ne te dispense pas de la **carte professionnelle** d'éducateur sportif.",
          "Elle ne remplace pas l'**assurance responsabilité civile professionnelle**.",
          "Elle ne déduit pas tes frais réels : ton abattement est forfaitaire, quel que soit ce que tu dépenses.",
        ],
      },
      {
        t: "quote",
        text: "Le vrai travail administratif d'un coach, ce n'est pas la micro-entreprise. C'est de savoir chaque semaine qui a payé, qui doit, et d'avoir la facture prête.",
      },
      {
        t: "p",
        text: "Madger encaisse tes clients en ligne, génère la facture avec les mentions obligatoires et te donne le total encaissé du mois pour ta déclaration. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "no-shows-coach-sportif",
    title: "No-shows : pourquoi tes clients ne viennent pas, et comment ne plus perdre la séance",
    description:
      "Les séances non honorées coûtent cher à un coach indépendant. Les causes réelles, la règle d'annulation qui marche, et pourquoi le paiement à la réservation change tout.",
    date: "2026-03-08",
    readingMinutes: 5,
    tags: ["No-show", "Annulation", "Paiement"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Un client qui ne vient pas, c'est une heure bloquée, un trajet parfois, et souvent zéro euro. Deux absences par mois à 50 euros, c'est 1 200 euros par an qui ne rentrent pas. Voici comment ça s'arrête.",
      },
      { t: "h2", text: "Pourquoi ils ne viennent pas" },
      {
        t: "ul",
        items: [
          "**Rien n'est engagé** : réserver par message ne coûte rien, donc annuler non plus.",
          "**Ils ont oublié** : sans rappel, une séance prise il y a dix jours disparaît de la tête.",
          "**La règle n'existe pas** : si tu n'as jamais dit ce qui se passe en cas d'absence, il ne se passe rien.",
        ],
      },
      { t: "h2", text: "Le paiement à la réservation" },
      {
        t: "p",
        text: "C'est le levier le plus puissant. Quand la séance est payée au moment de réserver, le client vient, ou il annule dans les règles. Ce n'est pas de la méfiance : les médecins, les restaurants et les coiffeurs s'y sont tous mis, et les clients trouvent ça normal.",
      },
      { t: "h2", text: "Une règle d'annulation, écrite et visible" },
      {
        t: "p",
        text: "Une seule phrase suffit : « Annulation gratuite jusqu'à 24 heures avant la séance. Passé ce délai, la séance est due. » Elle doit apparaître avant le paiement, pas après. On en parle dans [Politique d'annulation : la règle claire qui protège ton agenda](/blog/politique-annulation-coach).",
      },
      { t: "h2", text: "Le rappel automatique" },
      {
        t: "p",
        text: "Un email la veille et un rappel une heure avant divisent les oublis. À la main, tu ne tiendras pas trois semaines. Automatisé, tu n'y penses plus.",
      },
      { t: "h2", text: "Et l'absence pure et simple ?" },
      {
        t: "p",
        text: "Si le client ne vient pas et n'a pas annulé, la séance est acquise. Tu n'as pas à te justifier : c'est la règle qu'il a acceptée. Un geste commercial reste possible pour un vrai imprévu, mais c'est toi qui décides, pas lui.",
      },
      {
        t: "quote",
        text: "Le no-show n'est pas une fatalité du métier. C'est le symptôme d'une réservation sans engagement.",
      },
      {
        t: "p",
        text: "Sur Madger, le client paie en réservant, reçoit ses rappels, et ta règle d'annulation s'applique toute seule. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "combien-coute-coach-sportif",
    title: "Combien coûte un coach sportif ? Les vrais prix en 2026",
    description:
      "Prix d'une séance, d'un pack, d'un suivi mensuel, à domicile ou en visio : ce qu'un coach sportif coûte réellement en France et comment ne pas payer trop cher.",
    date: "2026-03-19",
    readingMinutes: 5,
    tags: ["Prix", "Choisir un coach"],
    audience: "client",
    content: [
      {
        t: "p",
        text: "Le prix d'un coach varie du simple au triple selon la ville, le format et l'expérience. Voici des repères honnêtes pour savoir si un tarif est cohérent.",
      },
      { t: "h2", text: "La séance individuelle" },
      {
        t: "p",
        text: "Compte généralement entre 40 et 70 euros de l'heure en province, et 60 à 90 euros à Paris. Le domicile est un peu plus cher que la salle ou l'extérieur, parce que le coach se déplace. Un coach très spécialisé (préparation physique, rééducation après blessure avec un kiné) peut facturer davantage.",
      },
      { t: "h2", text: "Les packs" },
      {
        t: "p",
        text: "Un pack de 10 séances est généralement remisé de 5 à 10 % par rapport au prix unitaire. Méfie-toi des remises énormes : elles cachent souvent un prix unitaire gonflé. Vérifie surtout la durée de validité et la règle de remboursement des séances non utilisées.",
      },
      { t: "h2", text: "Le suivi mensuel" },
      {
        t: "p",
        text: "Une formule où tu paies chaque mois un nombre de séances plus un suivi entre les séances (programme, messages). C'est la plus rentable si tu t'entraînes au moins une fois par semaine, et la plus engageante.",
      },
      { t: "h2", text: "La visio" },
      {
        t: "p",
        text: "Souvent 20 à 40 % moins chère que le présentiel, sans déplacement pour personne. Bon rapport qualité prix pour le renforcement et le suivi, moins adaptée à l'apprentissage technique.",
      },
      { t: "h2", text: "Ce qui doit être compris dans le prix" },
      {
        t: "ul",
        items: [
          "Le **matériel** apporté par le coach (à domicile et en extérieur).",
          "Le **programme** entre les séances, au moins pour un suivi mensuel.",
          "Une **règle d'annulation claire**, écrite avant que tu paies.",
        ],
      },
      { t: "h2", text: "Comment payer sans risque" },
      {
        t: "p",
        text: "Préfère un coach qui te fait payer en ligne à la réservation, avec une facture. Ton argent est protégé, tu as une trace, et le remboursement en cas d'annulation dans les règles est automatique.",
      },
      {
        t: "p",
        text: "Sur Madger, les prix sont affichés sur la page de chaque coach, le paiement est sécurisé et libéré au coach après la séance. [Compare les coachs près de chez toi](/coachs).",
      },
    ],
  },
  {
    slug: "packs-de-seances-coach",
    title: "Packs de séances : la formule qui lisse tes revenus de coach",
    description:
      "Pourquoi vendre des packs de 5, 10 ou 20 séances, comment fixer la remise, la validité et la règle de remboursement, et comment les vendre sans forcer.",
    date: "2026-03-30",
    readingMinutes: 5,
    tags: ["Packs", "Business", "Fidélisation"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Une séance vendue à l'unité, c'est un revenu qui s'arrête à chaque fois. Un pack, c'est dix séances engagées, un client qui revient et un mois de visibilité sur ton chiffre. Voici comment le construire.",
      },
      { t: "h2", text: "Trois tailles, pas plus" },
      {
        t: "p",
        text: "**5 séances** pour un objectif court (préparation à un événement, reprise), **10 séances** comme formule principale, **20 séances** pour les clients qui s'entraînent deux fois par semaine. Au-delà, ça devient un abonnement, et c'est un autre outil.",
      },
      { t: "h2", text: "La remise juste" },
      {
        t: "p",
        text: "Entre 5 et 10 % par rapport au prix unitaire. C'est assez pour que le client y voie un avantage, pas assez pour que tu travailles moins cher. La vraie valeur du pack pour toi, ce n'est pas la remise, c'est l'engagement.",
      },
      { t: "h2", text: "La validité" },
      {
        t: "p",
        text: "Un pack de 10 sans date de fin traîne des mois et bloque ton agenda mentalement. Donne une validité raisonnable (trois à six mois selon le rythme), écrite avant l'achat. Tu pourras toujours prolonger d'un geste pour un client sérieux qui a eu un imprévu.",
      },
      { t: "h2", text: "Le remboursement" },
      {
        t: "p",
        text: "Sois clair sur ce qui se passe si le client arrête : remboursement des séances restantes au prix unitaire (donc sans la remise), ou avoir. La règle doit exister avant le premier problème, pas être inventée pendant.",
      },
      { t: "h2", text: "Comment le vendre" },
      {
        t: "p",
        text: "À la fin de la première séance, pas avant. Le client vient de vivre ce que tu proposes : « Si tu veux continuer, le plus simple, c'est le pack de 10, tu réserves tes séances quand tu veux. » Une phrase, un lien, et il paie en ligne le soir même.",
      },
      {
        t: "quote",
        text: "Un pack, ce n'est pas une réduction. C'est un client qui a décidé de rester.",
      },
      {
        t: "p",
        text: "Sur Madger, le client achète le pack en ligne, place ses séances lui-même sur ton agenda, et le compteur de séances restantes se met à jour tout seul. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "instagram-coach-sportif-clients",
    title: "Instagram pour coach sportif : transformer tes abonnés en clients",
    description:
      "Tu as des abonnés mais pas de réservations ? Le lien en bio, les stories qui font réserver, et le parcours le plus court entre un post et une séance payée.",
    date: "2026-04-10",
    readingMinutes: 6,
    tags: ["Instagram", "Acquisition"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Beaucoup de coachs ont des centaines d'abonnés et zéro client venu d'Instagram. Le problème n'est presque jamais le contenu. C'est ce qui se passe après le contenu.",
      },
      { t: "h2", text: "Le parcours réel d'un abonné" },
      {
        t: "p",
        text: "Il voit ta story, il est motivé pendant trente secondes, il clique sur ton profil. S'il tombe sur « écris-moi en DM », il ne t'écrit pas : demander, c'est déjà s'engager. S'il tombe sur un lien où il voit tes prix, tes créneaux et peut réserver, une partie réserve. Tout se joue dans ces trente secondes.",
      },
      { t: "h2", text: "Le lien en bio" },
      {
        t: "p",
        text: "Un seul lien, vers une page qui répond aux trois questions : quoi (tes prestations), combien (tes prix) et quand (tes disponibilités). Pas une page d'accueil générique, pas un formulaire de contact. Une page où le prochain clic est « Réserver ».",
      },
      { t: "h2", text: "Les stories qui font réserver" },
      {
        t: "ul",
        items: [
          "**Le créneau qui se libère** : « Jeudi 18h vient de se libérer, premier arrivé » avec le lien. Ça marche parce que c'est concret et limité.",
          "**Le résultat d'un client** (avec son accord) : une phrase, un chiffre honnête, le lien.",
          "**L'avis reçu** : une capture de l'avis, sans commentaire, le lien.",
        ],
      },
      { t: "h2", text: "Ce qui ne marche pas" },
      {
        t: "p",
        text: "Les citations de motivation, les vidéos d'exercices sans rapport avec une offre, et les posts qui parlent de toi sans jamais dire comment on réserve. Ce contenu peut plaire, il ne vend pas.",
      },
      { t: "h2", text: "La régularité avant la perfection" },
      {
        t: "p",
        text: "Trois stories par semaine avec un lien battent un post parfait par mois. Ton abonné a besoin de te voir plusieurs fois avant de réserver. Simplifie ta production : ton téléphone, ta salle, une phrase, le lien.",
      },
      {
        t: "quote",
        text: "Instagram amène l'attention. Ta page de réservation transforme l'attention en séance payée. Sans la seconde, la première ne sert à rien.",
      },
      {
        t: "p",
        text: "Madger te donne ce lien : ta page, tes prix, tes créneaux, le paiement en ligne, et une story prête à partager avec tes chiffres et tes avis. [Crée ton lien](/signup).",
      },
    ],
  },
  {
    slug: "coaching-en-visio-ca-marche",
    title: "Coaching sportif en visio : est-ce que ça marche vraiment ?",
    description:
      "Ce que le coaching en visio fait bien, ce qu'il fait moins bien, le matériel nécessaire et les profils pour qui c'est le bon format.",
    date: "2026-04-21",
    readingMinutes: 4,
    tags: ["Visio", "Choisir un coach"],
    audience: "client",
    content: [
      {
        t: "p",
        text: "Le coaching par vidéo s'est installé pour de bon. Mais il ne remplace pas tout. Voici comment savoir si c'est fait pour toi.",
      },
      { t: "h2", text: "Ce qu'il fait bien" },
      {
        t: "ul",
        items: [
          "Le **renforcement au poids du corps** et avec petit matériel (élastiques, haltères légers).",
          "La **mobilité**, les étirements, le travail postural.",
          "Le **suivi** entre deux séances en présentiel : ajuster le programme, corriger, motiver.",
          "Les emplois du temps impossibles : une séance à 7h ou à 21h sans trajet.",
        ],
      },
      { t: "h2", text: "Ce qu'il fait moins bien" },
      {
        t: "p",
        text: "Apprendre un mouvement technique avec des charges lourdes (soulevé de terre, squat barre) demande un coach à côté de toi. Idem pour une reprise après blessure : le regard direct et la correction physique comptent.",
      },
      { t: "h2", text: "Le matériel" },
      {
        t: "p",
        text: "Un téléphone posé à deux mètres, un tapis, une connexion stable. Le coach doit te voir en entier. Pas besoin d'une caméra pro : un cadre stable et de la lumière suffisent.",
      },
      { t: "h2", text: "Le bon profil" },
      {
        t: "p",
        text: "Tu as déjà pratiqué, tu connais les bases, tu manques de régularité ou de temps. La visio te donne le rendez-vous et le regard qui font que tu ne sautes pas la séance.",
      },
      { t: "h2", text: "Le prix" },
      {
        t: "p",
        text: "Généralement moins cher que le présentiel, puisque personne ne se déplace. Le lien visio doit être créé par le coach et envoyé automatiquement avec la réservation : si tu dois le réclamer, c'est un mauvais signe sur son organisation.",
      },
      {
        t: "p",
        text: "Sur Madger, les coachs qui proposent la visio l'indiquent sur leur page, et le lien de la séance arrive avec ta confirmation. [Trouve un coach en visio](/coachs).",
      },
    ],
  },
  {
    slug: "facture-coach-sportif-mentions",
    title: "Facture de coach sportif : les mentions obligatoires, et comment l'automatiser",
    description:
      "Ce qu'une facture de coach sportif doit contenir pour être valable, la numérotation, la mention TVA, et pourquoi la faire à la main est une perte de temps.",
    date: "2026-05-02",
    readingMinutes: 5,
    tags: ["Facture", "Administratif"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Une facture n'est pas un reçu. C'est un document légal, avec des mentions précises, une numérotation continue et une conservation obligatoire. Voici ce qu'elle doit contenir, et comment ne plus jamais y passer une soirée.",
      },
      { t: "h2", text: "Les mentions obligatoires" },
      {
        t: "ul",
        items: [
          "Ton **nom** ou ta raison sociale, ton **adresse** et ton **numéro SIRET**.",
          "Le **nom et l'adresse du client**.",
          "Un **numéro de facture** unique, dans une séquence continue, sans trou.",
          "La **date** d'émission et la date de la prestation.",
          "Le **détail** de la prestation (séance de coaching, pack de 10 séances), le prix unitaire et le total.",
          "La **mention TVA** : « TVA non applicable, article 293 B du CGI » si tu es en franchise, sinon le taux et le montant.",
          "Les **conditions de paiement** et, pour un professionnel, les pénalités de retard.",
        ],
      },
      { t: "h2", text: "La numérotation, le piège classique" },
      {
        t: "p",
        text: "Pas de facture 12 après une facture 14, pas de 2026-03 puis 2026-05. Si tu annules une facture, tu émets un avoir, tu ne la supprimes pas. Un contrôle regarde la séquence en premier.",
      },
      { t: "h2", text: "Quand l'émettre" },
      {
        t: "p",
        text: "À l'encaissement pour un particulier. Une séance payée le 12, c'est une facture datée du 12. Un pack payé d'avance, c'est une facture du pack, pas dix factures de séances.",
      },
      { t: "h2", text: "Conservation" },
      {
        t: "p",
        text: "Dix ans. Un dossier sur ton ordinateur ne suffit pas si le disque lâche : garde une copie en ligne.",
      },
      { t: "h2", text: "Pourquoi l'automatiser" },
      {
        t: "p",
        text: "Vingt clients par mois, c'est vingt factures, vingt numéros, vingt envois. À la main, tu en oublies, tu te trompes de numéro, tu les fais en retard. Générée au moment du paiement, la facture est juste, numérotée et envoyée avant que tu y penses.",
      },
      {
        t: "quote",
        text: "La facture parfaite, c'est celle que tu n'as pas eu à faire.",
      },
      {
        t: "p",
        text: "Sur Madger, chaque paiement génère la facture avec tes mentions, dans ta séquence, envoyée au client et archivée dans ton espace. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "politique-annulation-coach",
    title: "Politique d'annulation : la règle claire qui protège ton agenda de coach",
    description:
      "Quel délai fixer, quel remboursement appliquer, comment l'annoncer sans braquer tes clients, et ce que dit la loi sur les annulations tardives.",
    date: "2026-05-13",
    readingMinutes: 5,
    tags: ["Annulation", "Business"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Sans règle d'annulation, chaque imprévu de tes clients devient ton problème. Avec une règle claire, annoncée avant le paiement, tout le monde sait à quoi s'en tenir. Voici comment la construire.",
      },
      { t: "h2", text: "Le délai : 24 heures est le standard" },
      {
        t: "p",
        text: "Une annulation à plus de 24 heures te laisse le temps de replacer quelqu'un ou de réorganiser ta journée. En dessous, le créneau est perdu. Certains coachs très demandés passent à 48 heures : c'est défendable si ton agenda est plein, pas au démarrage.",
      },
      { t: "h2", text: "Trois niveaux de règle" },
      {
        t: "ul",
        items: [
          "**Souple** : remboursement intégral jusqu'à 24 heures avant, remboursement partiel en dessous. Bon pour démarrer et rassurer.",
          "**Standard** : remboursement intégral jusqu'à 24 heures avant, rien en dessous. Le plus courant.",
          "**Stricte** : 48 heures. Pour un agenda déjà plein.",
        ],
      },
      { t: "h2", text: "L'absence sans annulation" },
      {
        t: "p",
        text: "La séance est due, sans exception écrite. Tu peux faire un geste, mais c'est un geste, pas un droit.",
      },
      { t: "h2", text: "L'annoncer sans braquer" },
      {
        t: "p",
        text: "La règle apparaît sur ta page, avant le paiement, en une phrase neutre. Tu ne l'expliques pas, tu ne t'excuses pas. Les clients qui protestent contre une règle d'annulation sont ceux qui comptaient annuler.",
      },
      { t: "h2", text: "Et si c'est toi qui annules ?" },
      {
        t: "p",
        text: "Remboursement intégral, immédiat, et une proposition de nouveau créneau. La règle vaut dans les deux sens, c'est ce qui la rend acceptable.",
      },
      {
        t: "quote",
        text: "Une règle appliquée à tout le monde n'a jamais fait perdre un bon client. Une règle inventée au cas par cas, si.",
      },
      {
        t: "p",
        text: "Sur Madger, tu choisis ta règle une fois, elle est affichée avant le paiement, et le remboursement se fait tout seul selon le délai. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "reprise-sport-apres-40-ans-coach",
    title: "Reprendre le sport après 40 ans : pourquoi un coach change tout",
    description:
      "Reprise du sport à 40, 50 ou 60 ans : les erreurs classiques, ce qu'un coach évite, et comment choisir quelqu'un qui comprend ton corps d'aujourd'hui.",
    date: "2026-05-24",
    readingMinutes: 5,
    tags: ["Reprise", "Santé", "Choisir un coach"],
    audience: "client",
    content: [
      {
        t: "p",
        text: "Reprendre le sport après des années d'arrêt, c'est surtout ne pas se blesser dans les six premières semaines. C'est là qu'un coach est le plus utile, et c'est là que la plupart des gens s'en passent.",
      },
      { t: "h2", text: "Les erreurs classiques de la reprise" },
      {
        t: "ul",
        items: [
          "Repartir sur le niveau d'il y a quinze ans, et se blesser la deuxième semaine.",
          "Faire uniquement du cardio, sans renforcement, alors que c'est le muscle qui protège les articulations.",
          "Tout faire en trois semaines, puis plus rien pendant trois mois.",
        ],
      },
      { t: "h2", text: "Ce qu'un coach fait à la reprise" },
      {
        t: "p",
        text: "Il commence par te regarder bouger. Une mobilité limitée à l'épaule, un genou qui rentre, un dos qui compense : il le voit à la première séance et adapte. Il construit une progression sur huit à douze semaines, pas un programme de magazine. Et il te donne un rendez-vous, ce qui est souvent ce qui manque le plus.",
      },
      { t: "h2", text: "Le rythme réaliste" },
      {
        t: "p",
        text: "Deux séances par semaine, dont une avec le coach, suffisent largement pour les deux premiers mois. Mieux vaut deux séances tenues pendant six mois que cinq séances pendant trois semaines.",
      },
      { t: "h2", text: "Choisir le bon coach" },
      {
        t: "p",
        text: "Demande-lui comment il aborde une reprise, s'il travaille avec des clients de ton âge, et ce qu'il fait en cas de douleur. Un coach qui répond « on va y aller progressivement, et on commence par voir comment tu bouges » a compris. Un coach qui te promet une transformation en 30 jours, non.",
      },
      { t: "h2", text: "Le mot du médecin" },
      {
        t: "p",
        text: "Si tu n'as pas fait de sport depuis longtemps, ou si tu as un traitement, un passage chez ton médecin avant la reprise est une bonne habitude. Un coach sérieux te le demandera lui-même.",
      },
      {
        t: "p",
        text: "Sur Madger, les pages des coachs indiquent leur spécialité et affichent les avis de leurs clients. [Trouve un coach qui accompagne les reprises](/coachs).",
      },
    ],
  },
  {
    slug: "gerer-agenda-coach-sportif",
    title: "Coach sportif : gérer ton agenda sans y passer tes soirées",
    description:
      "Créneaux, délai minimum, blocs perso, réservation en ligne : la méthode pour un agenda de coach qui se remplit seul et ne déborde pas sur ta vie.",
    date: "2026-06-04",
    readingMinutes: 5,
    tags: ["Agenda", "Organisation"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Le coach indépendant passe souvent plus de temps à organiser ses séances qu'à les donner : messages pour caler un créneau, changements de dernière minute, oublis. Voici comment reprendre la main.",
      },
      { t: "h2", text: "Définis tes créneaux une fois" },
      {
        t: "p",
        text: "Des plages fixes par jour (par exemple 7h à 13h et 17h à 20h) valent mieux que « dis-moi quand tu peux ». Le client choisit dans ce que tu offres, pas l'inverse. Tu peux ouvrir plus large au début et resserrer quand ça se remplit.",
      },
      { t: "h2", text: "Un délai minimum de réservation" },
      {
        t: "p",
        text: "Douze ou vingt-quatre heures. Une réservation à 6h du matin pour 8h, ce n'est pas une bonne surprise, c'est une journée désorganisée.",
      },
      { t: "h2", text: "Bloque ta vie perso avant qu'elle soit prise" },
      {
        t: "p",
        text: "Le mercredi après-midi des enfants, le vendredi soir, tes vacances : mets-les en indisponible avant que quelqu'un réserve dessus. Un agenda qui ne connaît pas tes limites les fera franchir.",
      },
      { t: "h2", text: "Laisse le client réserver seul" },
      {
        t: "p",
        text: "Chaque échange de messages pour trouver un créneau, c'est cinq minutes, souvent le soir. Vingt clients par mois, c'est des heures. Avec un lien de réservation, le client voit tes créneaux libres et prend celui qui lui va. Tu reçois une notification, c'est tout.",
      },
      { t: "h2", text: "Un seul agenda" },
      {
        t: "p",
        text: "Si tu utilises Google Agenda pour le reste de ta vie, synchronise-le : une séance réservée apparaît dedans, un rendez-vous perso bloque le créneau. Deux agendas, c'est un double-booking garanti.",
      },
      {
        t: "quote",
        text: "Le bon agenda, c'est celui que tu ne regardes que pour savoir qui vient, jamais pour négocier quand.",
      },
      {
        t: "p",
        text: "Sur Madger, tes disponibilités, ton délai minimum et tes blocs perso sont réglés une fois, et tes clients réservent seuls dans ce que tu ouvres. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "obtenir-avis-clients-coach",
    title: "Avis clients : comment les obtenir sans les mendier",
    description:
      "Les avis font réserver plus que n'importe quel post. Quand les demander, comment, et pourquoi la demande automatique après la séance marche mieux que tout.",
    date: "2026-06-15",
    readingMinutes: 4,
    tags: ["Avis", "Acquisition"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Un futur client hésite entre deux coachs. L'un a huit avis, l'autre aucun. Il ne compare même pas les programmes. Voici comment obtenir des avis, régulièrement, sans avoir l'air de les quémander.",
      },
      { t: "h2", text: "Le bon moment" },
      {
        t: "p",
        text: "Le lendemain d'une séance réussie, ou après une étape franchie (premier objectif atteint, fin d'un pack). Pas au bout de six mois, pas pendant la séance.",
      },
      { t: "h2", text: "La bonne formulation" },
      {
        t: "p",
        text: "Courte et sans pression : « Si la séance t'a plu, un avis m'aide beaucoup à trouver de nouveaux clients. Ça prend une minute. » Avec un lien direct. Pas de long message, pas de rappel insistant.",
      },
      { t: "h2", text: "L'automatiser" },
      {
        t: "p",
        text: "La demande envoyée automatiquement quelques jours après la séance, une seule fois par client, avec un lien vers le formulaire, obtient plus d'avis que n'importe quelle demande à la main. Parce qu'elle part toujours, au bon moment, et que tu n'as pas à te faire violence.",
      },
      { t: "h2", text: "Les avis négatifs" },
      {
        t: "p",
        text: "Ils arrivent. Réponds calmement, publiquement si c'est public, et propose une solution. Un avis moyen avec une réponse professionnelle rassure plus qu'une page de cinq étoiles sans un mot.",
      },
      { t: "h2", text: "Ce qu'il ne faut jamais faire" },
      {
        t: "p",
        text: "Écrire des avis toi-même, demander à des amis qui n'ont jamais été clients, ou acheter des avis. Un avis vérifié, lié à une séance réellement payée, vaut dix avis anonymes.",
      },
      {
        t: "p",
        text: "Sur Madger, seul un client qui a réellement réservé et payé peut laisser un avis, la demande part automatiquement après la séance, et tes avis s'affichent sur ta page. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "preparation-physique-coach-vs-seul",
    title: "Préparation physique : ce qu'un coach fait que tu ne fais pas seul",
    description:
      "Programme, progression, récupération, prévention des blessures : ce qu'un préparateur physique apporte à un sportif amateur ou compétiteur, et quand ça vaut le coût.",
    date: "2026-06-26",
    readingMinutes: 5,
    tags: ["Préparation physique", "Performance"],
    audience: "client",
    content: [
      {
        t: "p",
        text: "Tu cours, tu joues au foot le dimanche, tu prépares un trail ou un tournoi. Tu t'entraînes déjà. Pourquoi payer quelqu'un ? Voici ce que tu ne fais pas seul, même avec de la volonté.",
      },
      { t: "h2", text: "La progression, pas la répétition" },
      {
        t: "p",
        text: "Seul, on refait la séance qu'on aime. Un préparateur construit des blocs : force, puissance, endurance, récupération, dans un ordre qui produit un résultat à une date donnée. Le programme d'un mois n'est pas celui du mois suivant.",
      },
      { t: "h2", text: "Le travail que tu évites" },
      {
        t: "p",
        text: "Mobilité, gainage, renforcement des chaînes faibles, travail unilatéral : ce qui n'est pas spectaculaire et qui évite la blessure. Personne ne le fait spontanément. Le coach le programme et le fait faire.",
      },
      { t: "h2", text: "La charge d'entraînement" },
      {
        t: "p",
        text: "Trop, et tu te blesses ou tu stagnes. Pas assez, et tu n'avances pas. Le coach ajuste chaque semaine selon ta fatigue, ton sommeil, tes compétitions. C'est invisible, et c'est ce qui compte le plus.",
      },
      { t: "h2", text: "Quand ça vaut le coût" },
      {
        t: "ul",
        items: [
          "Tu prépares un **objectif daté** (course, compétition, épreuve).",
          "Tu te blesses régulièrement au même endroit.",
          "Tu stagnes depuis six mois malgré un entraînement régulier.",
        ],
      },
      { t: "h2", text: "Combien de séances" },
      {
        t: "p",
        text: "Souvent une séance encadrée par semaine plus un programme pour les autres, avec un point tous les quinze jours. C'est la formule la plus efficace pour un amateur sérieux, et la plus raisonnable financièrement.",
      },
      {
        t: "p",
        text: "Sur Madger, tu trouves des préparateurs physiques par sport et par ville, avec leurs prix, leurs avis et leurs créneaux. [Trouve ton préparateur](/coachs).",
      },
    ],
  },
  {
    slug: "cours-collectifs-petit-groupe-coach",
    title: "Cours collectifs en petit groupe : rentabilité et organisation pour un coach",
    description:
      "Combien de places, quel prix par personne, comment gérer les inscriptions et les absences : le cours en petit groupe comme troisième source de revenus du coach.",
    date: "2026-07-22",
    readingMinutes: 5,
    tags: ["Cours collectifs", "Business"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Une heure de coaching individuel, c'est un client payé. La même heure en petit groupe de six, c'est six clients à un prix plus bas chacun, souvent pour un revenu total supérieur. Voici comment monter un cours qui tient.",
      },
      { t: "h2", text: "La bonne taille" },
      {
        t: "p",
        text: "Entre 4 et 8 personnes. En dessous, la rentabilité est faible et l'ambiance aussi. Au-dessus, tu ne corriges plus personne et tu deviens un animateur. Fixe un minimum d'inscrits pour maintenir le cours (souvent 3) et un maximum ferme.",
      },
      { t: "h2", text: "Le prix" },
      {
        t: "p",
        text: "Entre 15 et 25 euros par personne et par cours, selon la ville. Six personnes à 20 euros, c'est 120 euros de l'heure, contre 50 à 70 en individuel. Un pack de 10 cours, un peu remisé, fidélise et remplit d'avance.",
      },
      { t: "h2", text: "Le lieu" },
      {
        t: "p",
        text: "Un parc (vérifie les règles de ta commune pour l'usage professionnel), une salle louée à l'heure, un studio partagé. Le coût du lieu doit rester une petite part du revenu du cours.",
      },
      { t: "h2", text: "Les inscriptions" },
      {
        t: "p",
        text: "Le point qui fait échouer la plupart des cours : gérer les places à la main. « Il reste deux places, qui vient ? » sur un groupe de messages, c'est ingérable la troisième semaine. Il te faut une page par cours, un nombre de places, un paiement à l'inscription, et une liste qui se remplit seule.",
      },
      { t: "h2", text: "Les absences" },
      {
        t: "p",
        text: "Même règle que l'individuel : place payée à la réservation, annulation possible jusqu'à un délai, place perdue ensuite. Sans ça, ton cours de six devient un cours de trois sans prévenir.",
      },
      {
        t: "quote",
        text: "Le cours collectif est le meilleur levier de revenu du coach, à une condition : que les places se vendent sans toi.",
      },
      {
        t: "p",
        text: "Sur Madger, tu crées un cours avec ses places, ses dates et son prix, les clients réservent et paient leur place en ligne, et tu vois qui vient. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "coach-sportif-et-tva",
    title: "Coach sportif et TVA : franchise en base, seuil, ce qui change quand tu le dépasses",
    description:
      "La franchise en base de TVA expliquée pour un coach sportif : la mention sur tes factures, le seuil à surveiller, et ce qui change concrètement quand tu deviens redevable.",
    date: "2026-08-02",
    readingMinutes: 5,
    tags: ["TVA", "Administratif"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "La TVA est le sujet que les coachs découvrent le jour où leur chiffre décolle. Mieux vaut comprendre avant. Voici l'essentiel, sans te transformer en comptable.",
      },
      { t: "h2", text: "La franchise en base" },
      {
        t: "p",
        text: "En dessous d'un seuil annuel de chiffre d'affaires, tu ne factures pas de TVA et tu ne la récupères pas sur tes achats. Tes factures portent la mention « TVA non applicable, article 293 B du CGI ». Pour un client particulier, ton prix affiché est ton prix payé, sans rien à ajouter.",
      },
      { t: "h2", text: "Le seuil" },
      {
        t: "p",
        text: "Il existe un seuil de base et un seuil majoré, et ils ont bougé plusieurs fois ces dernières années. Vérifie les montants en vigueur sur impots.gouv.fr au moins une fois par an, et surveille ton cumul de chiffre d'affaires dès que tu approches. Le dépassement se constate sur l'année civile.",
      },
      { t: "h2", text: "Ce qui change quand tu deviens redevable" },
      {
        t: "ul",
        items: [
          "Tu **factures la TVA** au taux normal sur tes prestations de coaching.",
          "Pour un particulier, soit tu **augmentes ton prix** du montant de la TVA, soit tu la prends sur ta marge. Décide-le avant, pas après.",
          "Tu **récupères la TVA** sur tes achats professionnels (matériel, logiciel, location de salle).",
          "Tu **déclares** la TVA selon un rythme fixé par ton régime.",
        ],
      },
      { t: "h2", text: "Anticiper plutôt que subir" },
      {
        t: "p",
        text: "Si tu sens que tu vas dépasser en cours d'année, prépare tes clients : un prix « TTC » annoncé dès maintenant t'évite une hausse brutale plus tard. Et regarde si ton outil de facturation sait passer en TVA sans que tu refasses tes factures à la main.",
      },
      {
        t: "quote",
        text: "La TVA n'est pas une punition pour avoir réussi. C'est le signe que ton activité a changé d'échelle, et elle se prépare.",
      },
      {
        t: "p",
        text: "Sur Madger, tu indiques ton régime dans tes réglages, et tes factures portent la bonne mention ou le bon taux automatiquement. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "preparer-rentree-coach-sportif",
    title: "Rentrée de septembre : préparer ta rentrée sportive de coach dès août",
    description:
      "Septembre est le mois où les clients cherchent un coach. Ce qu'il faut préparer en août : offres, créneaux, page, relances, pour remplir ton agenda dès la première semaine.",
    date: "2026-08-13",
    readingMinutes: 5,
    tags: ["Rentrée", "Acquisition", "Organisation"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "En septembre, les bonnes résolutions se prennent et les agendas se remplissent en dix jours. Le coach qui a préparé son mois d'août prend ces clients. Celui qui s'y met le 5 septembre les regarde partir ailleurs.",
      },
      { t: "h2", text: "Semaine 1 : tes offres" },
      {
        t: "p",
        text: "Une offre de rentrée simple et datée : par exemple un pack de 10 avec une première séance bilan incluse, valable pour toute réservation avant fin septembre. Pas de remise massive. Une raison claire de décider maintenant.",
      },
      { t: "h2", text: "Semaine 2 : tes créneaux" },
      {
        t: "p",
        text: "Ouvre ton agenda de septembre et d'octobre dès la mi-août. Un client qui veut commencer réserve pour dans deux semaines : si tes créneaux ne sont pas ouverts, il va voir ailleurs.",
      },
      { t: "h2", text: "Semaine 3 : ta page" },
      {
        t: "p",
        text: "Relis ta page comme un client qui ne te connaît pas : est-ce qu'on comprend en dix secondes ce que tu proposes, où, à quel prix, et comment réserver ? Mets à jour ta photo, tes prestations, tes avis récents.",
      },
      { t: "h2", text: "Semaine 4 : les anciens clients" },
      {
        t: "p",
        text: "Un message personnel à chaque client de l'année passée qui a arrêté : « La rentrée approche, j'ouvre mes créneaux de septembre, tu veux reprendre ? » avec ton lien. C'est la source de clients la moins chère qui existe, et la plus oubliée.",
      },
      { t: "h2", text: "Le 1er septembre" },
      {
        t: "p",
        text: "Une story par jour la première semaine, avec ton lien : ton offre, un créneau libre, un avis, un résultat. Tu récoltes en septembre ce que tu as préparé en août.",
      },
      {
        t: "p",
        text: "Madger te donne la page, les créneaux, les packs et le paiement en ligne pour que ta rentrée se joue sur ton coaching, pas sur ta logistique. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "coach-sportif-ou-salle-de-sport",
    title: "Coach sportif ou salle de sport : comment choisir ?",
    description:
      "Abonnement en salle ou séances avec un coach : le vrai coût, le vrai résultat, et la combinaison qui marche pour la plupart des gens.",
    date: "2026-08-24",
    readingMinutes: 4,
    tags: ["Choisir un coach", "Salle", "Prix"],
    audience: "client",
    content: [
      {
        t: "p",
        text: "L'abonnement en salle coûte moins cher par mois. Le coach coûte plus cher par séance. La question n'est pas celle du prix, c'est celle du résultat dans six mois.",
      },
      { t: "h2", text: "Le vrai coût de la salle" },
      {
        t: "p",
        text: "Un abonnement que tu utilises deux fois par mois revient cher par séance, et beaucoup d'abonnés s'arrêtent d'y aller après quelques semaines sans résilier. La salle vend l'accès. Elle ne vend pas la présence.",
      },
      { t: "h2", text: "Ce que le coach vend" },
      {
        t: "p",
        text: "Un rendez-vous que tu tiens, un programme adapté à toi, une correction quand tu fais mal, et une progression mesurée. Tu paies plus par séance, mais chaque séance produit quelque chose.",
      },
      { t: "h2", text: "La combinaison qui marche" },
      {
        t: "p",
        text: "Pour beaucoup, le bon montage, c'est un coach au début (un pack de 10 sur deux ou trois mois) pour apprendre les bons gestes et construire un programme, puis la salle en autonomie avec un point mensuel avec le coach. Tu gardes la structure sans payer chaque séance.",
      },
      { t: "h2", text: "Choisis la salle, si" },
      {
        t: "ul",
        items: [
          "Tu as déjà de l'expérience et un programme qui te convient.",
          "Tu y vas au moins deux fois par semaine sans te forcer.",
          "Tu aimes l'ambiance et le matériel.",
        ],
      },
      { t: "h2", text: "Choisis le coach, si" },
      {
        t: "ul",
        items: [
          "Tu reprends après une longue pause ou une blessure.",
          "Tu as un objectif précis et daté.",
          "Tu as déjà payé des abonnements que tu n'as pas utilisés.",
        ],
      },
      {
        t: "p",
        text: "Sur Madger, tu compares les coachs de ta ville, leurs prix et leurs avis, et tu réserves une première séance sans engagement. [Trouve ton coach](/coachs).",
      },
    ],
  },
  {
    slug: "abonnement-mensuel-coach-fideliser",
    title: "Fidéliser tes clients : l'abonnement mensuel expliqué pour un coach",
    description:
      "Le suivi mensuel, la formule qui transforme des séances ponctuelles en revenu régulier : quoi mettre dedans, comment le facturer, comment éviter les abandons.",
    date: "2026-09-05",
    readingMinutes: 5,
    tags: ["Abonnement", "Fidélisation", "Business"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Le pack engage sur dix séances. L'abonnement engage dans la durée. C'est la formule qui te donne un revenu prévisible en début de mois, et au client un suivi qui ne s'arrête pas quand le pack se termine.",
      },
      { t: "h2", text: "Ce qu'il contient" },
      {
        t: "p",
        text: "Un nombre de séances par mois (souvent 4, une par semaine), un programme pour les jours sans toi, et un canal de suivi (messages, un point rapide). Le client paie pour un accompagnement, pas pour des heures.",
      },
      { t: "h2", text: "Le prix" },
      {
        t: "p",
        text: "Le prix des séances incluses, légèrement remisé, plus la valeur du suivi. L'abonnement doit rester un peu plus avantageux que quatre séances à l'unité, sinon le client ne voit pas l'intérêt. Il doit aussi rester rentable pour toi une fois le temps de suivi compté.",
      },
      { t: "h2", text: "Le prélèvement automatique" },
      {
        t: "p",
        text: "Chaque mois, à date fixe, sans que tu envoies une demande. C'est ce qui fait la différence entre un abonnement et un pack qu'on renouvelle en y pensant. Le client entre sa carte une fois.",
      },
      { t: "h2", text: "Les séances non prises" },
      {
        t: "p",
        text: "Décide avant : reportables dans le mois, ou perdues. Le report illimité transforme ton abonnement en pack déguisé et casse ton agenda. Un report dans le mois est un bon compromis.",
      },
      { t: "h2", text: "Éviter les abandons" },
      {
        t: "p",
        text: "Le client qui arrête le fait au troisième mois, quand la motivation retombe. Un point mensuel sur ses résultats, un objectif suivant fixé ensemble, et un message quand il rate une séance : c'est ce qui fait passer le cap.",
      },
      {
        t: "quote",
        text: "L'abonnement, c'est le seul modèle où ton chiffre du mois prochain est connu le premier jour du mois.",
      },
      {
        t: "p",
        text: "Sur Madger, tu proposes une formule mensuelle, le client s'abonne en ligne, le prélèvement se fait chaque mois et le montant t'est versé automatiquement. [Crée ta page](/signup).",
      },
    ],
  },
  {
    slug: "paiement-en-3-fois-pack-coach",
    title: "Vendre un pack en 3 fois : le paiement fractionné pour tes clients",
    description:
      "Pourquoi proposer le paiement en trois fois sur tes packs, comment ça marche pour le coach (tu es payé en une fois), et à qui le proposer.",
    date: "2026-09-20",
    readingMinutes: 4,
    tags: ["Packs", "Paiement"],
    audience: "coach",
    content: [
      {
        t: "p",
        text: "Un pack de 20 séances à 55 euros, c'est plus de 1 000 euros d'un coup. Beaucoup de clients qui le veulent ne le prennent pas pour cette seule raison. Le paiement en trois fois enlève l'obstacle sans baisser ton prix.",
      },
      { t: "h2", text: "Comment ça marche" },
      {
        t: "p",
        text: "Le client choisit « payer en 3 fois » au moment du paiement. Un organisme de paiement fractionné lui avance la somme et prélève trois mensualités. Toi, tu es payé en une seule fois, dès la vente, et le risque d'impayé est porté par l'organisme, pas par toi.",
      },
      { t: "h2", text: "Ce que ça change pour le client" },
      {
        t: "p",
        text: "Il paie le même prix, réparti sur trois mois. Pour un pack de 600 euros, ce sont trois fois 200 euros : le montant devient comparable à ce qu'il dépense déjà en séances à l'unité, et la décision se prend.",
      },
      { t: "h2", text: "À partir de quel montant" },
      {
        t: "p",
        text: "Le fractionné a du sens à partir d'une centaine d'euros. En dessous, le client paie en une fois sans y penser. Réserve-le aux packs et aux grosses formules, pas à la séance à l'unité.",
      },
      { t: "h2", text: "Les frais" },
      {
        t: "p",
        text: "L'organisme prend une part de la transaction pour le service. Avant de l'activer, regarde comment ces frais sont répartis dans ton outil de paiement, et compare-les à ce que te rapporte un pack vendu qui ne l'aurait pas été sans.",
      },
      { t: "h2", text: "Comment le présenter" },
      {
        t: "p",
        text: "Tu n'as rien à dire : l'option apparaît au paiement, et le client la voit seul. Si tu en parles, une phrase suffit : « Le pack peut se payer en trois fois si tu préfères. »",
      },
      {
        t: "p",
        text: "Sur Madger, le paiement en trois fois s'active en un réglage sur tes packs, le client le choisit au paiement et tu es versé en une fois. [Crée ta page](/signup).",
      },
    ],
  },
];
