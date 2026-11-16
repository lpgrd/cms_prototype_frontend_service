"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Store, UserPlus, UsersRound, UserX } from "lucide-react";
import { Button as ShadcnButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, Badge, Button, Card, Checkbox, ConfirmDialog, ErrorState, Field, FormSelect, HIDE_BELOW, Input, MaskedInput, Modal, PageHeader, PasswordInput, RequiredNote, SelectInput, Spinner, Table, Td, Textarea, Th } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { date } from "@/lib/format";
import type { Role, Settings, User } from "@/lib/types";
import { useAuthOptions } from "@/lib/auth-options";
import { useCan, useMe } from "@/providers/auth";

export default function SettingsPage() {
  const can = useCan();
  const store = can("settings.manage");
  const users = can("users.manage");
  return (
    <>
      <PageHeader title="Settings" description="Store details, billing, rewards and who can sign in." />
      <div className={store && users ? "grid gap-6 xl:grid-cols-2" : "grid gap-6"}>
        {store && <StoreSettings />}
        {users && <UsersCard />}
      </div>
    </>
  );
}

/** Roles the current user may hand out: only superadmins can grant Superadmin. */
function useAssignableRoles() {
  const { data: me } = useMe();
  const { data } = useQuery({ queryKey: ["roles"], queryFn: () => api.get<Role[]>("/roles") });
  return (data ?? []).filter((r) => !r.isSuperadmin || me?.isSuperadmin);
}

function StoreSettings() {
  const authOptions = useAuthOptions();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/settings") });
  const { register, handleSubmit, control } = useForm<Settings>({ values: data });
  const save = useMutation({
    mutationFn: (s: Settings) =>
      api.patch<Settings>("/settings", {
        storeName: s.storeName,
        storeAddress: s.storeAddress || null,
        storePhone: s.storePhone || null,
        gstin: s.gstin ? s.gstin.toUpperCase() : null,
        invoicePrefix: s.invoicePrefix.toUpperCase(),
        taxRate: Number(s.taxRate),
        roundToNearestRupee: s.roundToNearestRupee,
        pointValue: Number(s.pointValue),
        minPayoutPoints: Number(s.minPayoutPoints),
        cashLimit: Number(s.cashLimit),
        panRequiredAbove: Number(s.panRequiredAbove),
        requireHuid: s.requireHuid,
        huidMinNetWeight: Number(s.huidMinNetWeight),
        requireRedemptionOtp: s.requireRedemptionOtp,
        pointsHoldDays: Number(s.pointsHoldDays),
        tdsRate: Number(s.tdsRate),
      }),
    onSuccess: (s) => (qc.setQueryData(["settings"], s), toast.success("Settings saved")),
  });
  const err = save.error instanceof ApiError ? save.error : null;

  if (isLoading) return <Card title="Store" icon={Store}><Spinner /></Card>;
  if (error) return <ErrorState error={error} />;

  return (
    <Card title="Store" icon={Store}>
      <form onSubmit={handleSubmit((s) => save.mutate(s))} className="space-y-4">
        {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
        <Field label="Store name" required><Input {...register("storeName", { required: true })} /></Field>
        <Field label="Address" hint="Printed on invoices."><Textarea rows={2} {...register("storeAddress")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone"><MaskedInput mask="phone" {...register("storePhone")} /></Field>
          <Field label="GSTIN" error={err?.field("gstin")}><MaskedInput mask="upper" maxLength={15} placeholder="22AAAAA0000A1Z5" {...register("gstin")} /></Field>
          <Field label="Invoice prefix" required error={err?.field("invoicePrefix")} hint="e.g. INV gives INV/2026-27/00001"><MaskedInput mask="upper" maxLength={12} {...register("invoicePrefix", { required: true })} /></Field>
          <Field label="GST rate (%)"><Input type="number" step="0.01" min="0" {...register("taxRate")} /></Field>
        </div>
        <Controller
          control={control}
          name="roundToNearestRupee"
          render={({ field }) => (
            <Checkbox label="Round bill totals to the nearest rupee" checked={!!field.value} onCheckedChange={field.onChange} />
          )}
        />
        <h3 className="border-t border-border pt-4 text-sm font-semibold">Partner rewards</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Value of 1 point (₹)" hint="Applies to new payout requests."><Input type="number" step="0.0001" min="0" {...register("pointValue")} /></Field>
          <Field label="Minimum payout (points)"><Input type="number" step="0.01" min="0" {...register("minPayoutPoints")} /></Field>
          <Field label="Points hold period (days)" hint="Return window before earned points become payable.">
            <Input type="number" step="1" min="0" max="365" {...register("pointsHoldDays")} />
          </Field>
          <Field label="TDS on payouts (%)" hint="Confirm the applicable rate with your CA.">
            <Input type="number" step="0.01" min="0" max="100" {...register("tdsRate")} />
          </Field>
        </div>
        <Controller
          control={control}
          name="requireRedemptionOtp"
          render={({ field }) => (
            <Checkbox label="Verify the customer's mobile with an SMS OTP before applying a partner code" checked={!!field.value} onCheckedChange={field.onChange} />
          )}
        />
        {authOptions.data && !authOptions.data.smsOtp && (
          <p className="-mt-2 text-xs text-muted-foreground">
            SMS isn&apos;t set up yet, so partner codes apply without an OTP until it is.
          </p>
        )}

        <h3 className="border-t border-border pt-4 text-sm font-semibold">Compliance</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Daily cash limit per customer (₹)" hint="Cash must stay below this (s.269ST: ₹2,00,000).">
            <Input type="number" step="1" min="1" {...register("cashLimit")} />
          </Field>
          <Field label="PAN required above (₹)" hint="Rule 114B: ₹2,00,000 for jewellery.">
            <Input type="number" step="1" min="0" {...register("panRequiredAbove")} />
          </Field>
          <Field label="HUID needed from (net g)" hint="Gold at or above this weight needs a HUID.">
            <Input type="number" step="0.001" min="0" {...register("huidMinNetWeight")} />
          </Field>
        </div>
        <Controller
          control={control}
          name="requireHuid"
          render={({ field }) => (
            <Checkbox label="Require HUID on hallmarked gold" checked={!!field.value} onCheckedChange={field.onChange} />
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>Save settings</Button>
        </div>
      </form>
    </Card>
  );
}

function UsersCard() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [roleFor, setRoleFor] = useState<User | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["users"], queryFn: () => api.get<User[]>("/users") });
  const [disableFor, setDisableFor] = useState<User | null>(null);
  const toggle = useMutation({
    mutationFn: (u: User) => api.patch(`/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: (_, u) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setDisableFor(null);
      toast.success(u.isActive ? `${u.name} can no longer sign in` : `${u.name} can sign in again`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card
      title="People with access" icon={UsersRound}
      padded={false}
      actions={<Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setOpen(true)}>Add staff</Button>}
    >
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="p-4"><ErrorState error={error} /></div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th className={HIDE_BELOW.sm}>Role</Th>
              <Th className={HIDE_BELOW.md}>2FA</Th>
              <Th className={HIDE_BELOW.lg}>Last sign-in</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id}>
                <Td>
                  <div className="font-medium">{u.name}</div>
                  <div className="max-w-56 truncate text-xs text-muted-foreground">{u.email}</div>
                  <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                    {u.accountType === "PARTNER" ? <Badge>Partner</Badge> : <Badge tone={u.role?.isSuperadmin ? "gold" : "info"}>{u.role?.name}</Badge>}
                    {!u.isActive && <Badge tone="danger">Disabled</Badge>}
                  </div>
                </Td>
                <Td className={HIDE_BELOW.sm}>
                  {u.accountType === "PARTNER" ? (
                    <Badge>Partner</Badge>
                  ) : (
                    <Badge tone={u.role?.isSuperadmin ? "gold" : "info"}>{u.role?.name}</Badge>
                  )}
                </Td>
                <Td className={HIDE_BELOW.md}>{u.totpEnabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}</Td>
                <Td className={cn(HIDE_BELOW.lg, "text-muted-foreground")}>{date(u.lastLoginAt)}</Td>
                <Td className="text-right">
                  {u.id !== me?.id && (!u.role?.isSuperadmin || me?.isSuperadmin) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<ShadcnButton variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`} />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.accountType === "INTERNAL" && <DropdownMenuItem onClick={() => setRoleFor(u)}>Change role…</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => setResetFor(u)}>Reset access…</DropdownMenuItem>
                        {u.isActive ? (
                          <DropdownMenuItem variant="destructive" onClick={() => setDisableFor(u)}>Disable login…</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => toggle.mutate(u)}>Enable login</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <AddUserDialog open={open} onClose={() => setOpen(false)} />
      {resetFor && <ResetAccessDialog user={resetFor} onClose={() => setResetFor(null)} />}
      {roleFor && <ChangeRoleDialog user={roleFor} onClose={() => setRoleFor(null)} />}
      <ConfirmDialog
        open={!!disableFor}
        onClose={() => setDisableFor(null)}
        title={`Disable ${disableFor?.name ?? "this user"}'s login?`}
        description="They're signed out straight away and can't sign in until you enable the login again. Their history is kept."
        confirmLabel="Disable login"
        icon={<UserX className="size-4" />}
        loading={toggle.isPending}
        onConfirm={() => disableFor && toggle.mutate(disableFor)}
      />
    </Card>
  );
}

function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const roles = useAssignableRoles();
  const { register, handleSubmit, reset, control, setValue } = useForm({ defaultValues: { name: "", email: "", password: "", roleId: "" } });
  const create = useMutation({
    mutationFn: (v: { name: string; email: string; password: string; roleId: string }) => api.post("/users", v),
    onSuccess: () => (qc.invalidateQueries({ queryKey: ["users"] }), qc.invalidateQueries({ queryKey: ["roles"] }), reset(), onClose(), toast.success("User added")),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a user"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} onClick={handleSubmit((v) => create.mutate(v))}>Add user</Button>
        </>
      }
    >
      <div className="space-y-4">
        {create.isError && <Alert tone="danger">{errorMessage(create.error)}</Alert>}
        <Field label="Name" required><Input {...register("name", { required: true })} /></Field>
        <Field label="Email" required><Input type="email" {...register("email", { required: true })} /></Field>
        <Field label="Temporary password" required hint="At least 8 characters. Share it with them directly.">
          <PasswordInput autoComplete="new-password" {...register("password", { required: true })} onGenerate={(p) => setValue("password", p)} />
        </Field>
        <Field label="Role" required hint="What they can do is set per role under Roles & access.">
          <FormSelect control={control} name="roleId" placeholder="Choose a role" options={roles.map((r) => ({ value: r.id, label: r.name }))} />
        </Field>
        <RequiredNote />
      </div>
    </Modal>
  );
}

function ChangeRoleDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const roles = useAssignableRoles();
  const [roleId, setRoleId] = useState(user.roleId ?? "");
  const save = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}`, { roleId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      onClose();
      toast.success(`${user.name}'s role is updated. It applies immediately.`);
    },
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={`Change role for ${user.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} disabled={!roleId || roleId === user.roleId} onClick={() => save.mutate()}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
        <Field label="Role" required>
          <SelectInput value={roleId} onValueChange={setRoleId} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
        </Field>
      </div>
    </Modal>
  );
}

/** Owner resets a user's password and/or clears their 2FA (lost phone). Both sign the user out everywhere. */
function ResetAccessDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const [password, setPassword] = useState("");
  const [clear2fa, setClear2fa] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      api.patch(`/users/${user.id}`, { ...(password ? { password } : {}), ...(clear2fa ? { resetTwoFactor: true } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
      toast.success(`Access reset for ${user.name}`);
    },
  });
  const valid = (password.length >= 8 || (!password && clear2fa)) && (password || clear2fa);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reset access for ${user.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>Reset</Button>
        </>
      }
    >
      <div className="space-y-4">
        {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
        <Field label="New temporary password" hint="Leave empty to keep the current password. At least 8 characters.">
          <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} onGenerate={setPassword} />
        </Field>
        {user.totpEnabled && (
          <Checkbox label="Turn off their two-step verification (lost phone)" checked={clear2fa} onCheckedChange={setClear2fa} />
        )}
        <p className="text-xs text-muted-foreground">They will be signed out of every device. Share the new password with them directly.</p>
      </div>
    </Modal>
  );
}
