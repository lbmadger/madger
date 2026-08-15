import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import PublicHeader from "@/components/marketplace/PublicHeader";
import CoachProfile from "@/components/marketplace/CoachProfile";
import type {
  PublicCoach,
  PublicReview,
  CoachPhoto,
} from "@/lib/coaches/public-types";
import type { PublicService } from "@/lib/services/types";

// Page VITRINE : une page coach d'exemple, remplie à fond, à montrer aux
// futurs coachs (« voilà à quoi ressemblera ta page »). Contenu 100 %
// statique (aucune donnée en base) : les CTA n'ouvrent pas de vraie
// réservation, ils invitent à créer sa page. Publique et partageable.

export const metadata: Metadata = {
  title: "Madger · Exemple de page coach",
  description:
    "Découvre à quoi ressemble une page de coach sur Madger : présentation, prestations, avis, réservation en ligne. Crée la tienne gratuitement.",
  alternates: { canonical: "/exemple" },
};

const DEMO_COACH: PublicCoach = {
  id: "demo",
  slug: "exemple",
  first_name: "Emma",
  last_name: "Laurent",
  specialty: "Coach musculation & remise en forme",
  bio: "Coach sportive diplômée d'État depuis 8 ans, je t'accompagne vers tes objectifs avec un programme sur mesure, en salle ou à domicile. Perte de poids, prise de masse ou simple remise en forme : on avance ensemble, à ton rythme, sans jamais te juger. Premier échange offert pour définir ton plan.",
  avatar_url:
    "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=400&q=80",
  city: "Lyon",
  accepts_online: true,
  lat: 45.764,
  lng: 4.8357,
  stripe_charges_enabled: true,
  cancellation_policy: "moderate",
  refund_over_24h_pct: 100,
  refund_under_24h_pct: 50,
  booking_mode: "instant",
  created_at: "2024-01-15T09:00:00.000Z",
  rating_avg: 4.9,
  rating_count: 27,
  sport: "musculation",
  specialties: ["weight_loss", "muscle_gain", "fitness"],
  venues: ["coach_gym", "client_home", "outdoor"],
  gym_name: "Basic-Fit Lyon Part-Dieu",
  from_price_cents: 4500,
  verified: true,
};

const DEMO_SERVICES: PublicService[] = [
  {
    id: "demo-single",
    coach_id: "demo",
    name: "Séance individuelle",
    description:
      "1h en tête-à-tête, programme adapté à ton niveau et ton objectif du jour.",
    type: "single",
    location: "in_person",
    duration_min: 60,
    price_cents: 4500,
    currency: "eur",
    pack_size: null,
  },
  {
    id: "demo-pack",
    coach_id: "demo",
    name: "Pack 10 séances",
    description:
      "10 séances à utiliser quand tu veux, pour t'installer dans la durée et voir de vrais résultats.",
    type: "pack",
    location: "in_person",
    duration_min: 60,
    price_cents: 39000,
    currency: "eur",
    pack_size: 10,
  },
  {
    id: "demo-sub",
    coach_id: "demo",
    name: "Suivi mensuel illimité",
    description:
      "Programme personnalisé réactualisé chaque semaine, suivi par messages et 2 séances / mois incluses.",
    type: "subscription",
    location: "online",
    duration_min: 60,
    price_cents: 12000,
    currency: "eur",
    pack_size: null,
  },
];

// Galerie Résultats de démonstration : paires avant/après illustrées
// (silhouettes stylisées maison, même personnage qui se transforme),
// légendes cohérentes avec les avis. De vraies photos de banque d'images
// montreraient deux personnes différentes : pire que l'illustration.
const DEMO_PHOTOS: CoachPhoto[] = [
  {
    id: "p1",
    url: "/exemple/julie-avant.png",
    url_after: "/exemple/julie-apres.png",
    caption: "Julie · -6 kg en 3 mois",
  },
  {
    id: "p2",
    url: "/exemple/karim-avant.png",
    url_after: "/exemple/karim-apres.png",
    caption: "Karim · +5 kg de masse en 6 mois",
  },
  {
    id: "p3",
    url: "/exemple/thomas-avant.png",
    url_after: "/exemple/thomas-apres.png",
    caption: "Thomas · reprise après 10 ans d'arrêt",
  },
];

// 27 avis (le compteur affiché) : moyenne 4,9 (25 cinq étoiles, 2 quatre).
// Les 3 premiers portent les vraies histoires, le reste varie entre
// commentaires courts et notes sans commentaire, comme dans la vraie vie.
const DEMO_REVIEWS: PublicReview[] = [
  {
    id: "r1",
    coach_id: "demo",
    rating: 5,
    comment:
      "Emma est top ! En 3 mois j'ai perdu 6 kg et surtout j'ai enfin pris goût au sport. Les séances passent super vite.",
    created_at: "2025-05-12T10:00:00.000Z",
    client_first_name: "Julie",
    reply: null,
    replied_at: null,
  },
  {
    id: "r2",
    coach_id: "demo",
    rating: 5,
    comment:
      "Très à l'écoute et hyper pédagogue. Le programme est vraiment adapté à mon emploi du temps chargé.",
    created_at: "2025-04-28T10:00:00.000Z",
    client_first_name: "Karim",
    reply: null,
    replied_at: null,
  },
  {
    id: "r3",
    coach_id: "demo",
    rating: 4,
    comment:
      "Super accompagnement pour reprendre le sport après des années sans rien faire. Rien à redire, je recommande les yeux fermés.",
    created_at: "2025-03-30T10:00:00.000Z",
    client_first_name: "Thomas",
    // Montre la réponse publique du coach (migration 0053) sur la démo.
    reply:
      "Merci Thomas ! Reprendre après des années sans sport, c'est le plus dur. Bravo pour ta régularité, on continue.",
    replied_at: "2025-04-01T10:00:00.000Z",
  },
  ...(
    [
      [5, "Séance d'essai transformée en abonnement direct. Emma sait motiver sans mettre la pression.", "Sarah", "2025-03-18"],
      [5, "Programme béton et suivi sérieux entre les séances. Je sens enfin des progrès durables.", "Mehdi", "2025-03-02"],
      [5, null, "Laura", "2025-02-20"],
      [5, "Les séances en extérieur au parc sont géniales, ça change de la salle.", "Antoine", "2025-02-11"],
      [5, "Après ma grossesse je voulais reprendre en douceur, Emma a tout adapté. Merci !", "Camille", "2025-01-28"],
      [4, "Très pro. Juste parfois un peu de retard sur le créneau du soir.", "Nicolas", "2025-01-15"],
      [5, null, "Emma R.", "2025-01-06"],
      [5, "On rigole autant qu'on transpire, et les résultats sont là : -4 kg.", "Sophie", "2024-12-19"],
      [5, "Le paiement en ligne et les rappels automatiques, ça change tout niveau orga.", "Hugo", "2024-12-05"],
      [5, "Coach exigeante mais bienveillante. Exactement ce qu'il me fallait.", "Inès", "2024-11-22"],
      [5, null, "Bastien", "2024-11-10"],
      [5, "Mon dos ne me fait plus souffrir depuis qu'on bosse le gainage ensemble.", "Nathalie", "2024-10-30"],
      [5, "Séances duo avec ma copine, super formule et prix correct.", "Maxime", "2024-10-17"],
      [5, null, "Chloé", "2024-10-02"],
      [5, "Un an de suivi, jamais une séance ratée. La régularité paye !", "Romain", "2024-09-20"],
      [5, "Emma m'a préparé pour mon premier 10 km, objectif atteint en 52 min.", "Élodie", "2024-09-08"],
      [5, null, "Kevin", "2024-08-25"],
      [5, "La visio quand je suis en déplacement, c'est vraiment pratique.", "Marine", "2024-08-12"],
      [5, "Très bons conseils nutrition en plus des séances.", "Yanis", "2024-07-28"],
      [5, null, "Aurélie", "2024-07-14"],
      [5, "Je détestais le sport. Maintenant j'y vais 3 fois par semaine. CQFD.", "Damien", "2024-06-30"],
      [5, "Accueil top à la salle, matériel nickel, séances variées.", "Lucie", "2024-06-15"],
      [5, null, "Farid", "2024-05-31"],
      [5, "Remise en forme après blessure, en lien avec mon kiné. Très pro.", "Céline", "2024-05-18"],
    ] as const
  ).map(([rating, comment, name, date], i) => ({
    id: `r${i + 4}`,
    coach_id: "demo",
    rating,
    comment,
    created_at: `${date}T10:00:00.000Z`,
    client_first_name: name,
    reply: null,
    replied_at: null,
  })),
];

export default function ExampleCoachPage() {
  const { locale, dict } = getServerDictionary();
  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="min-h-screen bg-bg">
        <PublicHeader />
        <CoachProfile
          coach={DEMO_COACH}
          services={DEMO_SERVICES}
          reviews={DEMO_REVIEWS}
          photos={DEMO_PHOTOS}
          demo
        />
      </div>
    </I18nProvider>
  );
}
