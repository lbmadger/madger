// Créneau de disponibilité récurrent (hebdomadaire). weekday : 0 = dimanche
// … 6 = samedi (convention Postgres/JS). start_time/end_time : "HH:MM:SS".
export type Availability = {
  id: string;
  coach_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

// Ordre d'affichage lundi → dimanche, avec la clé i18n du jour.
export const WEEK_ORDER: { weekday: number; key: string }[] = [
  { weekday: 1, key: "mon" },
  { weekday: 2, key: "tue" },
  { weekday: 3, key: "wed" },
  { weekday: 4, key: "thu" },
  { weekday: 5, key: "fri" },
  { weekday: 6, key: "sat" },
  { weekday: 0, key: "sun" },
];

// "09:00:00" → "09:00"
export function hhmm(time: string): string {
  return time.slice(0, 5);
}
