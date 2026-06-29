// Valeurs publiques Supabase (URL du projet + clé anon).
//
// La clé `anon` est PUBLIQUE par conception : elle est de toute façon embarquée
// dans le bundle navigateur, et l'accès aux données est borné par les
// politiques RLS définies en base. La committer en valeur de repli est donc
// sans risque — c'est ce que fait n'importe quelle app Supabase.
//
// ⚠️ À ne JAMAIS confondre avec la clé `service_role` (secrète), qui n'apparaît
// nulle part dans le code et reste uniquement côté serveur via variable d'env.
//
// Les variables d'environnement restent prioritaires si elles sont définies
// (utile pour pointer vers un autre projet en local/staging sans toucher au
// code).

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://xodcgghsgjpuebrkhaih.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZGNnZ2hzZ2pwdWVicmtoYWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTIzNDYsImV4cCI6MjA5NDg2ODM0Nn0.kDecGu904A2rKYlL1roECwXKHSbg4y9mLJfTxxl1uUA";
