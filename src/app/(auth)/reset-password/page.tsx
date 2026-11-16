import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { AuthShell } from "../auth-shell";
import { ResetPasswordForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<Spinner />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
