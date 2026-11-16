"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, Button, Field, PasswordInput } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match");
    setPending(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated. Sign in with your new password.");
      router.replace("/login");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (!token) return <Alert tone="danger">This reset link is missing its token. Request a new one.</Alert>;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">You&apos;ll be signed out of other devices.</p>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="New password" hint="At least 8 characters." required>
        <PasswordInput autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Confirm password" required error={confirm && confirm !== password ? "Passwords don't match" : undefined}>
        <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full" loading={pending} disabled={password.length < 8}>
        Update password
      </Button>
    </form>
  );
}
