// Faits sport & coaching pour les stories partageables (carte « fait du
// jour »). Règle de marque : rien d'inventé ni de chiffre douteux. Les seuls
// chiffres cités sont des recommandations institutionnelles établies (OMS,
// consensus sommeil) ; le reste est qualitatif et défendable.
export type StoryFact = {
  // Accroche courte affichée en haut de la carte.
  kicker: string;
  // Le fait lui-même (2 lignes max à l'écran, rester sous ~140 caractères).
  text: string;
};

export const STORY_FACTS: StoryFact[] = [
  {
    kicker: "Le savais-tu ?",
    text: "L'OMS recommande au moins 150 minutes d'activité modérée par semaine. Deux séances encadrées, et tu y es presque.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Le muscle ne se construit pas pendant la séance, mais pendant la récupération. Le repos fait partie du programme.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Sans entraînement, la masse musculaire décline progressivement dès la trentaine. La musculation, c'est un investissement long terme.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Un échauffement progressif prépare les muscles, les articulations et le système nerveux. Les minutes les plus rentables de ta séance.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "La régularité bat l'intensité : trois séances moyennes par semaine construisent plus que une séance parfaite de temps en temps.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Le sommeil est le meilleur produit de récupération du marché : 7 à 9 heures par nuit, et il est gratuit.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "L'activité physique régulière est l'un des meilleurs alliés du moral : le corps et la tête s'entraînent ensemble.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "La technique avant la charge : une exécution propre protège tes articulations et fait progresser plus vite que des kilos en plus.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "S'hydrater, ce n'est pas boire pendant la séance : c'est boire toute la journée. La performance commence des heures avant.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Marcher compte. La dépense du quotidien (escaliers, trajets, ménage) pèse lourd dans ton total de la semaine.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« Transpirer beaucoup = brûler plus » : faux. La transpiration régule ta température, elle ne mesure pas ta séance.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« Les courbatures prouvent une bonne séance » : faux. On peut progresser sans avoir mal, et avoir mal sans progresser.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« La musculation rend forcément massif » : faux. Elle sculpte, renforce et protège. Le volume, c'est un choix d'entraînement.",
  },
  {
    kicker: "Côté coach",
    text: "Un bon coach ne vend pas des séances : il vend de la constance. C'est elle qui transforme.",
  },
  {
    kicker: "Côté coach",
    text: "Être accompagné, c'est déléguer la discipline les jours où elle manque. C'est exactement ça, le métier de coach.",
  },
  {
    kicker: "Côté coach",
    text: "Un programme générique s'adapte à personne. Un coach adapte la séance à ta forme du jour, tes objectifs et ton historique.",
  },
  {
    kicker: "Côté coach",
    text: "Le plus dur dans le sport, ce n'est pas la séance : c'est d'y aller. Un rendez-vous posé dans l'agenda règle la question.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Le renforcement musculaire est recommandé au moins deux fois par semaine par l'OMS, à tout âge.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "S'asseoir moins et bouger plus, même par petites touches, compte déjà : chaque mouvement est un point marqué contre la sédentarité.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "La force protège au quotidien : porter, monter, se relever. On ne s'entraîne pas que pour l'été, on s'entraîne pour la vie.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Le meilleur programme du monde est celui que tu tiens. La perfection sur le papier ne brûle aucune calorie.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Les jambes sont le plus gros moteur du corps : les entraîner profite à tout le reste, posture, dos et souffle compris.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "L'entraînement s'adapte à la forme du jour : une séance allégée un jour de fatigue vaut mieux qu'une séance sautée.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "Noter ses séances change tout : on ne progresse bien que sur ce qu'on mesure.",
  },
  {
    kicker: "Le savais-tu ?",
    text: "La marche rapide est un vrai entraînement cardio, accessible partout, sans matériel et sans excuse.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« On peut cibler la perte de graisse sur une zone » : faux. Le corps déstocke globalement, pas là où on fait des abdos.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« Plus on s'entraîne, mieux c'est » : faux. Sans récupération, l'entraînement en trop devient de la fatigue en trop.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« Le gainage, c'est juste pour les abdos » : faux. C'est le socle qui protège ton dos sur tous les mouvements.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« Il faut finir épuisé pour que ça compte » : faux. Une bonne séance se termine fatigué, pas détruit.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« Après 50 ans, la musculation c'est risqué » : faux. Bien encadrée, c'est justement l'un des meilleurs investissements santé.",
  },
  {
    kicker: "Vrai ou faux ?",
    text: "« Étirements avant la séance = moins de blessures » : pas si simple. Ce qui protège, c'est un échauffement progressif et adapté.",
  },
  {
    kicker: "Côté coach",
    text: "Ce que tu achètes avec un coach, ce n'est pas une séance : c'est des années d'erreurs que tu n'auras pas à faire.",
  },
  {
    kicker: "Côté coach",
    text: "Un coach voit ce que tu ne vois pas : la posture, la compensation, le mouvement qui te blessera dans six mois.",
  },
  {
    kicker: "Côté coach",
    text: "La motivation va et vient. Un rendez-vous avec quelqu'un qui t'attend, ça, ça reste.",
  },
  {
    kicker: "Côté coach",
    text: "Les progrès viennent rarement d'en faire plus. Ils viennent de faire mieux, et c'est le métier du coach.",
  },
  {
    kicker: "Côté coach",
    text: "Un objectif sans plan, c'est un souhait. Un objectif avec un coach, c'est un calendrier.",
  },
  {
    kicker: "Côté coach",
    text: "Le jour où tu n'as pas envie, c'est le jour où être attendu fait toute la différence.",
  },
];

// Fait « du jour » : déterministe (jour depuis l'époque), tout le monde voit
// le même fait le même jour, et la rotation couvre toute la banque.
export function factOfTheDay(offset = 0): StoryFact {
  const day = Math.floor(Date.now() / 86400000);
  const i = ((day + offset) % STORY_FACTS.length + STORY_FACTS.length) % STORY_FACTS.length;
  return STORY_FACTS[i];
}
