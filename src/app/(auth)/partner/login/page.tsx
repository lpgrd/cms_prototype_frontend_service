import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "../../auth-shell";
import { LoginForm } from "../../login/login-form";

export const metadata: Metadata = { title: "Partner sign-in" };

/** Partners (influencers, businesses) who bring customers with their own code. */
export default function PartnerLoginPage() {
  return (
    <AuthShell footer={{ href: "/login", label: "Store staff? Sign in here" }}>
      <Suspense>
        <LoginForm portal="partner" />
      </Suspense>
    </AuthShell>
  );
}
