import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDictionary } from "@/lib/i18n/server";

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
          <div className="mb-8 flex items-center justify-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-base">
              Madger
            </span>
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
              App
            </span>
          </div>
          {children}
        </div>
      </div>
    </I18nProvider>
  );
}
