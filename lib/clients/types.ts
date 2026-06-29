// Client (élève) d'un coach, tel que stocké en base.
export type Client = {
  id: string;
  coach_id: string;
  created_at: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};
