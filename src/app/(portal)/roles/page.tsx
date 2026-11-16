"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, Badge, Button, Card, Checkbox, ConfirmDialog, ErrorState, Field, Input, Modal, PageHeader, Spinner, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { Permission, PermissionGroup, Role } from "@/lib/types";
import { useMe } from "@/providers/auth";

const GROUP_HINTS: Record<string, string> = {
  Dashboard: "Share the dashboard and choose which widgets this role sees. Widgets that aren't shared are never sent to their browser.",
};

export default function RolesPage() {
  const { data: me } = useMe();
  const isSuperadmin = !!me?.isSuperadmin;
  const [editing, setEditing] = useState<Role | "new" | null>(null);

  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api.get<Role[]>("/roles") });
  const catalog = useQuery({ queryKey: ["permission-catalog"], queryFn: () => api.get<PermissionGroup[]>("/roles/permissions"), staleTime: Infinity });

  if (roles.isLoading || catalog.isLoading) return <Spinner />;
  if (roles.error || catalog.error || !roles.data || !catalog.data) return <ErrorState error={roles.error ?? catalog.error} />;
  const total = catalog.data.reduce((n, g) => n + g.permissions.length, 0);
  const labelOf = new Map(catalog.data.flatMap((g) => g.permissions.map((p) => [p.key, p.label] as const)));

  return (
    <>
      <PageHeader
        title="Roles & access"
        description={
          isSuperadmin
            ? "Create roles from permissions and share dashboard widgets. Changes apply to everyone with the role immediately."
            : "What each role can do. Only a superadmin can change roles."
        }
        actions={isSuperadmin && <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>New role</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.data.map((role) => (
          <Card
            key={role.id}
            title={
              <span className="flex items-center gap-2">
                {role.name}
                {role.isSuperadmin ? (
                  <Badge tone="gold">
                    <Lock className="mr-1 size-3" /> Full access
                  </Badge>
                ) : role.isSystem ? (
                  <Badge>Built-in</Badge>
                ) : null}
              </span>
            }
            actions={
              <Button size="sm" variant="ghost" onClick={() => setEditing(role)}>
                {isSuperadmin && !role.isSuperadmin ? "Edit" : "View"}
              </Button>
            }
          >
            {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{role.userCount ?? 0} {role.userCount === 1 ? "user" : "users"},</span>
              <span>
                {role.isSuperadmin ? "All" : role.permissions.length} of {total} permissions
              </span>
            </div>
            {!role.isSuperadmin && (
              <div className="mt-3 flex flex-wrap gap-1">
                {role.permissions.slice(0, 6).map((p) => (
                  <Badge key={p} tone="neutral">{labelOf.get(p) ?? p}</Badge>
                ))}
                {role.permissions.length > 6 && <Badge tone="neutral">+{role.permissions.length - 6} more</Badge>}
              </div>
            )}
          </Card>
        ))}
      </div>

      {editing && (
        <RoleEditor
          role={editing === "new" ? null : editing}
          catalog={catalog.data}
          readOnly={!isSuperadmin || (editing !== "new" && editing.isSuperadmin)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function RoleEditor({
  role,
  catalog,
  readOnly,
  onClose,
}: {
  role: Role | null;
  catalog: PermissionGroup[];
  readOnly: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<Permission>>(
    new Set(role?.isSuperadmin ? catalog.flatMap((g) => g.permissions.map((p) => p.key)) : (role?.permissions ?? [])),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const done = (message: string) => {
    qc.invalidateQueries({ queryKey: ["roles"] });
    qc.invalidateQueries({ queryKey: ["auth", "me"] });
    toast.success(message);
    onClose();
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), description: description.trim() || null, permissions: [...selected] };
      return role ? api.patch<Role>(`/roles/${role.id}`, body) : api.post<Role>("/roles", body);
    },
    onSuccess: () => done(role ? "Role updated. It applies immediately." : "Role created"),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/roles/${role!.id}`),
    onSuccess: () => done("Role deleted"),
  });

  const toggle = (key: Permission, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      // Sharing a widget implies sharing the dashboard; hiding the dashboard hides its widgets.
      if (on && key.startsWith("dashboard.") && key !== "dashboard.view") next.add("dashboard.view");
      if (!on && key === "dashboard.view") for (const k of [...next]) if (k.startsWith("dashboard.")) next.delete(k);
      return next;
    });
  const toggleGroup = (group: PermissionGroup, on: boolean) => group.permissions.forEach((p) => toggle(p.key, on));

  const title = role ? (readOnly ? role.name : `Edit ${role.name}`) : "New role";

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      wide
      footer={
        readOnly ? (
          <Button variant="secondary" onClick={onClose}>Close</Button>
        ) : (
          <div className="flex w-full items-center justify-between gap-2">
            {role && !role.isSystem ? (
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button loading={save.isPending} disabled={name.trim().length < 2} onClick={() => save.mutate()}>
                {role ? "Save role" : "Create role"}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {(save.isError || remove.isError) && <Alert tone="danger">{errorMessage(save.error ?? remove.error)}</Alert>}
        {role?.isSuperadmin && <Alert tone="info">Superadmin always has every permission, including ones added in future. It can&apos;t be edited.</Alert>}
        {!role?.isSuperadmin && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required={!readOnly}>
              <Input value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} placeholder="e.g. Store Manager" />
            </Field>
            <Field label="Description">
              <Textarea rows={1} value={description} disabled={readOnly} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
        )}

        <div className="space-y-4">
          {catalog.map((group) => {
            const keys = group.permissions.map((p) => p.key);
            const all = keys.every((k) => selected.has(k));
            return (
              <section key={group.group} role="group" aria-labelledby={`perm-${group.group}`} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 id={`perm-${group.group}`} className="text-sm font-semibold">{group.group === "Dashboard" ? "Dashboard sharing" : group.group}</h3>
                  {!readOnly && (
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => toggleGroup(group, !all)}>
                      {all ? "Clear all" : "Select all"}
                    </button>
                  )}
                </div>
                {GROUP_HINTS[group.group] && <p className="mb-3 text-xs text-muted-foreground">{GROUP_HINTS[group.group]}</p>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.permissions.map((p) => (
                    <Checkbox key={p.key} label={p.label} checked={selected.has(p.key)} disabled={readOnly} onCheckedChange={(on) => toggle(p.key, on)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${role?.name}?`}
        description="A role that is still assigned can't be deleted. Move its users to another role first."
        confirmLabel="Delete role"
        icon={<Trash2 className="size-4" />}
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Modal>
  );
}
