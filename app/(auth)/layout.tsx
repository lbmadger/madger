import Image from "next/image";
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
          <div className="mb-8 flex justify-center">
            {/* Contour + léger halo : l'icône est un carré sombre, sinon ses
                bords se fondent dans le fond quasi-noir. */}
            <Image
              src="/madger-app-icon.png"
              alt="Madger"
              width={64}
              height={64}
              priority
              className="h-16 w-16 rounded-[22%] ring-1 ring-white/15 shadow-lg shadow-black/40"
            />
          </div>
          {children}
        </div>
      </div>
    </I18nProvider>
  );
}
