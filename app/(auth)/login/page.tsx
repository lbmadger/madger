import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Madger · Connexion",
  description: "Connecte-toi à ton espace Madger.",
  robots: { index: false, follow: true },
};

// Connexion. useSearchParams (lecture du ?redirect) impose un Suspense.
export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
