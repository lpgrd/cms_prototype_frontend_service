import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Owners and staff. Partners have their own page at /partner/login. */
export default function LoginPage() {
  return (
    <AuthShell footer={{ href: "/partner/login", label: "Partner? Sign in here" }}>
      <Suspense>
        <LoginForm portal="staff" />
      </Suspense>
    </AuthShell>
  );
}
