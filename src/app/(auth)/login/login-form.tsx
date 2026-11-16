"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { KeyRound, LogIn } from "lucide-react";
import { Alert, Button, Field, Input, PasswordInput } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Me } from "@/lib/types";
import { homeFor, ME_KEY } from "@/providers/auth";
import { SIGN_IN_PATH, type SignInPortal } from "../auth-shell";

interface Credentials {
  email: string;
  password: string;
}

type LoginResponse = { user: Me } | { twoFactorRequired: true; challengeToken: string };

/** Sign-in form for one of the two pages; the API turns away accounts that belong on the other page. */
export function LoginForm({ portal }: { portal: SignInPortal }) {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when this account belongs on the other sign-in page.
  const [otherPage, setOtherPage] = useState(false);
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState("");
  const { register, handleSubmit } = useForm<Credentials>();

  const finish = (user: Me) => {
    qc.setQueryData(ME_KEY, user);
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && next !== "/" ? next : homeFor(user));
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setOtherPage(false);
    setPending(true);
    try {
      await fn();
    } catch (err) {
      setOtherPage(err instanceof ApiError && err.code === "WRONG_SIGN_IN_PAGE");
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const onPassword = handleSubmit((values) =>
    run(async () => {
      const res = await api.post<LoginResponse>("/auth/login", { ...values, portal });
      if ("user" in res) finish(res.user);
      else setChallengeToken(res.challengeToken);
    }),
  );

  const onCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const res = await api.post<{ user: Me }>("/auth/login/2fa", { challengeToken, code });
      finish(res.user);
    });
  };

  if (challengeToken) {
    return (
      <form onSubmit={onCode} className="w-full space-y-5">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-semibold">Two-step verification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app, or one of your recovery codes.
          </p>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Code" required>
          <Input
            autoFocus
            autoComplete="one-time-code"
            inputMode="text"
            className="font-mono tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full" loading={pending} disabled={code.trim().length < 6} icon={<KeyRound />}>
          Verify
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => (setChallengeToken(null), setCode(""), setError(null))}
        >
          ← Use a different account
        </button>
      </form>
    );
  }

  const other: SignInPortal = portal === "staff" ? "partner" : "staff";
  return (
    <form onSubmit={onPassword} className="w-full space-y-5">
      <h1 className="text-center font-heading text-2xl font-semibold">{portal === "staff" ? "Sign in" : "Partner sign-in"}</h1>
      {error && (
        <Alert tone="danger">
          {error}
          {otherPage && (
            <Link href={SIGN_IN_PATH[other]} className="mt-1 block font-medium underline underline-offset-2">
              Go to the {other === "partner" ? "partner" : "staff"} sign-in
            </Link>
          )}
        </Alert>
      )}
      <Field label="Email" required>
        <Input type="email" autoComplete="email" autoFocus required {...register("email", { required: true })} />
      </Field>
      <Field label="Password" required>
        <PasswordInput autoComplete="current-password" required {...register("password", { required: true })} />
      </Field>
      <Button type="submit" className="w-full" loading={pending} icon={<LogIn />}>
        Sign in
      </Button>
      <Link
        href={portal === "partner" ? "/forgot-password?for=partner" : "/forgot-password"}
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Forgot password?
      </Link>
    </form>
  );
}
