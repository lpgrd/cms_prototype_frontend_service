"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Gem, KeyRound, LogIn } from "lucide-react";
import { Alert, Button, Field, HallmarkTile, Input, PasswordInput } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { Me } from "@/lib/types";
import { homeFor, ME_KEY } from "@/providers/auth";

interface Credentials {
  email: string;
  password: string;
}

type LoginResponse = { user: Me } | { twoFactorRequired: true; challengeToken: string };

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setPending(true);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const onPassword = handleSubmit((values) =>
    run(async () => {
      const res = await api.post<LoginResponse>("/auth/login", values);
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
      <form onSubmit={onCode} className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Two-step verification</h1>
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

  return (
    <form onSubmit={onPassword} className="w-full max-w-sm space-y-5">
      <div>
        <HallmarkTile icon={Gem} className="mb-6 lg:hidden" />
        <h1 className="font-heading text-3xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Owners, staff and partners use the same portal.</p>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="Email" required>
        <Input type="email" autoComplete="email" autoFocus required {...register("email", { required: true })} />
      </Field>
      <Field label="Password" required>
        <PasswordInput autoComplete="current-password" required {...register("password", { required: true })} />
      </Field>
      <Button type="submit" className="w-full" loading={pending} icon={<LogIn />}>
        Sign in
      </Button>
      <Link href="/forgot-password" className="block text-center text-sm text-muted-foreground hover:text-foreground">
        Forgot password?
      </Link>
    </form>
  );
}
