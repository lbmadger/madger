import { redirect } from "next/navigation";
import { getCoach } from "@/lib/coach/getCoach";
import { createClient } from "@/lib/supabase/server";
import { nameFromMetadata } from "@/lib/auth/nameFromUser";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

// Étape d'onboarding. Le middleware garantit déjà qu'on est connecté. Si le
// profil est déjà complété, on file au dashboard. Si la table n'existe pas
// encore (SQL non lancé), on laisse afficher le formulaire : la soumission
// échouera proprement avec un message, sans page blanche.
export default async function OnboardingPage() {
  const { coach } = await getCoach();

  if (coach?.onboarding_completed) {
    redirect("/dashboard");
  }
  // Compte sans fiche coach (un client arrivé ici par un lien mémorisé) :
  // le formulaire coach écrirait dans le vide puis bloquerait à l'étape 2.
  if (!coach) {
    redirect("/onboarding-client");
  }

  // Pré-remplissage : la fiche coach déjà en base prime ; sinon on reprend le
  // nom fourni par le compte (Google), pour ne pas le faire retaper.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = nameFromMetadata(user?.user_metadata);

  // Reprise après rechargement : nom et lien déjà posés → étape 2 ;
  // prestation déjà créée → étape 3. Rien n'est refait ni dupliqué.
  const { count: servicesCount } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coach.id);
  const step1Done = Boolean(coach.first_name && coach.last_name && coach.slug);
  const initialStep: 1 | 2 | 3 = (servicesCount ?? 0) > 0 ? 3 : step1Done ? 2 : 1;

  return (
    <OnboardingForm
      userId={coach.id}
      initialFirstName={coach.first_name || meta.firstName}
      initialLastName={coach.last_name || meta.lastName}
      initialSlug={coach.slug}
      initialStep={initialStep}
    />
  );
}
