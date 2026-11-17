"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, IdCard, LockKeyhole, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DefinitionList,
  Field,
  MaskedInput,
  Modal,
  PageHeader,
  PasswordInput,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { date } from "@/lib/format";
import { ME_KEY, roleLabel, useMe } from "@/providers/auth";

export default function AccountPage() {
  const { data: me } = useMe();
  if (!me) return null;
  return (
    <>
      <PageHeader title="Account" description="Your sign-in details and security." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile" icon={IdCard}>
          <DefinitionList
            items={[
              ["Name", me.name],
              ["Email", me.email],
              ["Role", roleLabel(me)],
              ["Last sign-in", date(me.lastLoginAt)],
            ]}
          />
        </Card>
        <TwoFactorCard enabled={me.totpEnabled} privileged={me.isSuperadmin || me.permissions.includes("users.manage")} />
        <ChangePasswordCard />
      </div>
    </>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = useMutation({
    mutationFn: () => api.post("/auth/change-password", { currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed. Your other devices have been signed out.");
    },
  });
  const mismatch = confirm.length > 0 && next !== confirm;

  return (
    <Card title="Change password" icon={LockKeyhole}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate();
        }}
      >
        {change.isError && <Alert tone="danger">{errorMessage(change.error)}</Alert>}
        <Field label="Current password" required>
          <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 8 characters." required>
          <PasswordInput autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password" required error={mismatch ? "Passwords don't match" : undefined}>
          <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={change.isPending} disabled={!current || next.length < 8 || next !== confirm}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface TotpSetup {
  secret: string;
  uri: string;
  qrDataUrl: string;
}

function TwoFactorCard({ enabled, privileged }: { enabled: boolean; privileged: boolean }) {
  const qc = useQueryClient();
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [password, setPassword] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ME_KEY });

  const begin = useMutation({
    mutationFn: () => api.post<TotpSetup>("/auth/2fa/setup"),
    onSuccess: setSetup,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const enable = useMutation({
    mutationFn: () => api.post<{ recoveryCodes: string[] }>("/auth/2fa/enable", { code }),
    onSuccess: (res) => {
      setSetup(null);
      setCode("");
      setRecoveryCodes(res.recoveryCodes);
      refresh();
    },
  });
  const disable = useMutation({
    mutationFn: () => api.post("/auth/2fa/disable", { password }),
    onSuccess: () => {
      setDisableOpen(false);
      setPassword("");
      refresh();
      toast.success("Two-step verification turned off");
    },
  });

  return (
    <Card
      title="Two-step verification"
      icon={ShieldCheck}
      actions={enabled ? <Badge tone="success">On</Badge> : <Badge tone="warning">Off</Badge>}
    >
      {!enabled && !setup && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sign-in will also ask for a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).
          </p>
          {privileged && (
            <Alert tone="warning">Your role can manage other people&apos;s access, so we strongly recommend turning this on.</Alert>
          )}
          <Button icon={<ShieldCheck />} loading={begin.isPending} onClick={() => begin.mutate()}>
            Set up two-step verification
          </Button>
        </div>
      )}

      {setup && (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Scan this QR code with your authenticator app.</li>
            <li>Enter the 6-digit code it shows to confirm.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
          <img src={setup.qrDataUrl} alt="Authenticator QR code" className="size-44 rounded-lg border border-border bg-white p-1" />
          <p className="text-xs text-muted-foreground">
            Can&apos;t scan? Enter this key manually: <span className="font-mono break-all">{setup.secret}</span>
          </p>
          {enable.isError && <Alert tone="danger">{errorMessage(enable.error)}</Alert>}
          <div className="flex gap-2">
            <MaskedInput
              mask="digits"
              maxLength={6}
              aria-label="6-digit code"
              autoComplete="one-time-code"
              placeholder="123456"
              className="tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button loading={enable.isPending} disabled={code.length !== 6} onClick={() => enable.mutate()}>
              Confirm
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSetup(null)}>
            Cancel
          </Button>
        </div>
      )}

      {enabled && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Sign-in asks for a code from your authenticator app.</p>
          <Button variant="secondary" icon={<ShieldOff />} onClick={() => setDisableOpen(true)}>
            Turn off
          </Button>
        </div>
      )}

      <Modal
        open={!!recoveryCodes}
        onClose={() => setRecoveryCodes(null)}
        title="Save your recovery codes"
        footer={<Button onClick={() => setRecoveryCodes(null)}>I&apos;ve saved them</Button>}
      >
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Each code signs you in once if you lose your phone. They won&apos;t be shown again, so store them somewhere safe.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono">
            {recoveryCodes?.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Copy />}
            onClick={() => navigator.clipboard.writeText(recoveryCodes?.join("\n") ?? "").then(() => toast.success("Copied"))}
          >
            Copy codes
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="Turn off two-step verification?"
        description="Signing in will only need your password, which makes your account easier to take over."
        confirmLabel="Turn off"
        icon={<ShieldOff className="size-4" />}
        loading={disable.isPending}
        disabled={!password}
        onConfirm={() => disable.mutate()}
      >
        {disable.isError && <Alert tone="danger">{errorMessage(disable.error)}</Alert>}
        <Field label="Confirm with your password" required>
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </Card>
  );
}
