"use client";

import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuthOptions } from "@/lib/auth-options";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const options = useAuthOptions();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">We&apos;ll email you a link to set a new password.</p>
      </div>
      {options.data && !options.data.passwordResetByEmail ? (
        // No mail server yet: the owner sets new passwords from Settings instead.
        <Alert tone="info">Reset by email isn&apos;t set up yet. Ask the store owner to set a new password for you.</Alert>
      ) : sent ? (
        <Alert tone="success">If an account exists for {email}, a reset link is on its way. It expires in 30 minutes.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Email" required>
            <Input type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Send reset link
          </Button>
        </form>
      )}
    </>
  );
}
