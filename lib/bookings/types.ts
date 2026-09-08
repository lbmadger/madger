export type LocationKind = "in_person" | "online";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

// Séance, avec le client embarqué (jointure Supabase) pour l'affichage.
export type Booking = {
  id: string;
  coach_id: string;
  client_id: string | null;
  service_id: string | null;
  created_at: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  // Créneau bloqué par le coach (aucune réservation possible dessus).
  is_block?: boolean | null;
  // Place dans un cours collectif (migration 0068).
  group_session_id?: string | null;
  location: LocationKind;
  location_text: string | null;
  meeting_url: string | null;
  notes: string | null;
  clients: {
    first_name: string;
    last_name: string | null;
  } | null;
};

// Cours collectif planifié par le coach (table group_sessions).
export type GroupSession = {
  id: string;
  coach_id: string;
  service_id: string | null;
  name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  currency: string;
  location: LocationKind;
  location_text: string | null;
  meeting_url: string | null;
  notes: string | null;
  status: "scheduled" | "cancelled";
  series_id: string | null;
};

// Prestation telle que l'agenda en a besoin (créer un cours collectif).
export type AgendaService = {
  id: string;
  name: string;
  type: "single" | "pack" | "subscription";
  capacity: number | null;
  price_cents: number;
  currency: string;
  duration_min: number | null;
  location: LocationKind;
};

// Client minimal pour le sélecteur du formulaire de séance.
export type ClientOption = {
  id: string;
  first_name: string;
  last_name: string | null;
};
