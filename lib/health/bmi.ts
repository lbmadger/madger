// IMC (indice de masse corporelle) et catégories OMS. Utilisé côté client
// (aperçu en direct pendant l'onboarding) et côté coach (fiche client).

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  const v = weightKg / (m * m);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
}

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return "underweight";
  if (value < 25) return "normal";
  if (value < 30) return "overweight";
  return "obese";
}

export function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

// Profil sportif tel que stocké (table client_profiles).
export type ClientProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birth_date: string | null;
  sex: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  goals: string[];
  level: "beginner" | "intermediate" | "advanced" | null;
  note: string | null;
  completed: boolean;
};

export const GOAL_KEYS = [
  "weight_loss",
  "muscle_gain",
  "fitness",
  "endurance",
  "mobility",
  "health_back",
  "competition",
] as const;
