import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";
import MadgerLogo from "@/components/ui/MadgerLogo";

// Layout des écrans d'authentification (/login, /signup). Le route group
// "(auth)" n'ajoute rien à l'URL. Centré, dark, avec le provider i18n pour
// que le formulaire soit bilingue comme le reste de l'app.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = getServerDictionary();

  return (
    <I18nProvider locale={locale} dict={dict}>
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            {/* Logo vectoriel officiel (même que la navbar de la landing),
                posé sur un halo lime doux pour le détacher du fond. */}
            <div className="relative">
              <div
                className="absolute inset-0 -z-10 blur-2xl"
                style={{ background: "radial-gradient(circle, rgba(203,255,3,0.25), transparent 70%)" }}
              />
              <MadgerLogo size={60} className="rounded-[22%] ring-1 ring-white/10" />
            </div>
          </div>
          {children}
        </div>
      </div>
    </I18nProvider>
  );
}
