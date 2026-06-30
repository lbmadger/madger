import Topbar from "@/components/dashboard/Topbar";
import SettingsForm from "@/components/dashboard/settings/SettingsForm";
import { getCoach } from "@/lib/coach/getCoach";
import { getServerDictionary } from "@/lib/i18n/server";

// Réglages : édition du profil public du coach (alimente la marketplace).
export default async function SettingsPage() {
  const { dict } = getServerDictionary();
  const { coach } = await getCoach();

  return (
    <>
      <Topbar title={dict.settings.title} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {coach && <SettingsForm coach={coach} />}
      </main>
    </>
  );
}
