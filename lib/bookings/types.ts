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
  location: LocationKind;
  location_text: string | null;
  meeting_url: string | null;
  notes: string | null;
  clients: {
    first_name: string;
    last_name: string | null;
  } | null;
};

// Client minimal pour le sélecteur du formulaire de séance.
export type ClientOption = {
  id: string;
  first_name: string;
  last_name: string | null;
};
