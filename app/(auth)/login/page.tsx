import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";

// Connexion. useSearchParams (lecture du ?redirect) impose un Suspense.
export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
