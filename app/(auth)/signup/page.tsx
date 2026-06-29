import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";

// Inscription coach. Suspense requis pour useSearchParams (cf. login).
export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
