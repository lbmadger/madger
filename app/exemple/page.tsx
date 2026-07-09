import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import PublicHeader from "@/components/marketplace/PublicHeader";
import CoachProfile from "@/components/marketplace/CoachProfile";
import type { PublicCoach, PublicReview } from "@/lib/coaches/public-types";
import type { PublicService } from "@/lib/services/types";

// Page VITRINE : une page coach d'exemple, remplie à fond, à montrer aux
// futurs coachs (« voilà à quoi ressemblera ta page »). Contenu 100 %
// statique (aucune donnée en base) : les CTA n'ouvrent pas de vraie
// réservation, ils invitent à créer sa page. Publique et partageable.

export const metadata: Metadata = {
  title: "Exemple de page coach · Madger",
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
  bio: "Coach sportive diplômée d'État depuis 8 ans, je t'accompagne vers tes objectifs avec un programme sur mesure, en salle ou à domicile. Perte de poids, prise de masse, préparation physique ou simple remise en forme : on avance ensemble, à ton rythme, sans jamais te juger. Premier échange offert pour définir ton plan.",
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
  venues: ["coach_gym", "home", "outdoor"],
  gym_name: "Basic-Fit Lyon Part-Dieu",
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

const DEMO_REVIEWS: PublicReview[] = [
  {
    id: "r1",
    coach_id: "demo",
    rating: 5,
    comment:
      "Emma est top ! En 3 mois j'ai perdu 6 kg et surtout j'ai enfin pris goût au sport. Les séances passent super vite.",
    created_at: "2025-05-12T10:00:00.000Z",
    client_first_name: "Julie",
  },
  {
    id: "r2",
    coach_id: "demo",
    rating: 5,
    comment:
      "Très à l'écoute et hyper pédagogue. Le programme est vraiment adapté à mon emploi du temps chargé.",
    created_at: "2025-04-28T10:00:00.000Z",
    client_first_name: "Karim",
  },
  {
    id: "r3",
    coach_id: "demo",
    rating: 4,
    comment:
      "Super accompagnement pour ma prépa. Rien à redire, je recommande les yeux fermés.",
    created_at: "2025-03-30T10:00:00.000Z",
    client_first_name: "Thomas",
  },
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
          demo
        />
      </div>
    </I18nProvider>
  );
}
