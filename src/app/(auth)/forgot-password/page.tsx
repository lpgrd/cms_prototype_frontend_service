import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, SIGN_IN_PATH } from "../auth-shell";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  return (
    <Suspense>
      <ForgotPassword searchParams={searchParams} />
    </Suspense>
  );
}

/** Reached from either sign-in page; ?for=partner leads back to the partner one. */
async function ForgotPassword({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const back = (await searchParams).for === "partner" ? SIGN_IN_PATH.partner : SIGN_IN_PATH.staff;
  return (
    <AuthShell footer={{ href: back, label: "Back to sign in" }}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
