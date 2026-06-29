import { redirect } from "next/navigation";
import { getCoach } from "@/lib/coach/getCoach";
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

  return (
    <OnboardingForm
      userId={coach?.id ?? ""}
      initialFirstName={coach?.first_name ?? ""}
      initialLastName={coach?.last_name ?? ""}
    />
  );
}
