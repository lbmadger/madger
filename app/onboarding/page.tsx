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

  // Pré-remplissage : la fiche coach déjà en base prime ; sinon on reprend le
  // nom fourni par le compte (Google), pour ne pas le faire retaper.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = nameFromMetadata(user?.user_metadata);

  return (
    <OnboardingForm
      userId={coach?.id ?? user?.id ?? ""}
      initialFirstName={coach?.first_name || meta.firstName}
      initialLastName={coach?.last_name || meta.lastName}
    />
  );
}
