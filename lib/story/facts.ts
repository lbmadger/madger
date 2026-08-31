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
];

// Fait « du jour » : déterministe (jour depuis l'époque), tout le monde voit
// le même fait le même jour, et la rotation couvre toute la banque.
export function factOfTheDay(offset = 0): StoryFact {
  const day = Math.floor(Date.now() / 86400000);
  const i = ((day + offset) % STORY_FACTS.length + STORY_FACTS.length) % STORY_FACTS.length;
  return STORY_FACTS[i];
}
