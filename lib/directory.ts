// Démarrage à froid de l'annuaire : en dessous de ce nombre de coachs
// publiés (vue public_coaches), /coachs affiche « ouvre bientôt » en noindex
// et le sitemap ne l'annonce pas. Partagé entre la page et le sitemap pour
// que Google reçoive un seul signal.
export const DIRECTORY_MIN_COACHES = 10;
