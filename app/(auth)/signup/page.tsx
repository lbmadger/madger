import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

// Titre selon le parcours : un client qui vient réserver ne crée pas un
// « compte coach ».
export function generateMetadata({
  searchParams,
}: {
  searchParams: { role?: string };
}): Metadata {
  const client = searchParams?.role === "client";
  return {
    alternates: { canonical: "/signup" },
    title: client ? "Madger · Crée ton compte" : "Madger · Crée ton compte coach",
    description: client
      ? "Crée ton compte en une minute pour réserver et retrouver tes séances."
      : "Crée ta page de coach en cinq minutes : réservations, paiement d'avance et factures automatiques. 0 € par mois.",
    ...(client ? { robots: { index: false, follow: false } } : {}),
  };
}

// Inscription coach. Suspense requis pour useSearchParams (cf. login).
export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
