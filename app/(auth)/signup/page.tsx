import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  alternates: { canonical: "/signup" },
  title: "Madger · Crée ton compte coach",
  description:
    "Crée ta page de coach en cinq minutes : réservations, paiement d'avance et factures automatiques. 0 € par mois.",
};

// Inscription coach. Suspense requis pour useSearchParams (cf. login).
export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
