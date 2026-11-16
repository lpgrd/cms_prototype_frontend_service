"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Contact, Mail, MoreHorizontal, Phone, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, Badge, Button, Card, Checkbox, ConfirmDialog, Field, Input, MaskedInput, Modal, SelectInput } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api, errorMessage } from "@/lib/api";
import { phone } from "@/lib/format";
import type { ContactType, CustomerContact } from "@/lib/types";

const LABELS: Record<ContactType, string[]> = {
  PHONE: ["Mobile", "WhatsApp", "Landline", "Work", "Home", "Old", "Other"],
  EMAIL: ["Personal", "Work", "Other"],
};

/** Phones and emails of a customer, each with a label and a remark. The primary mobile is the customer's identity. */
export function ContactsCard({ customerId, contacts, editable }: { customerId: string; contacts: CustomerContact[]; editable: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CustomerContact | { type: ContactType } | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["customer", customerId] });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CustomerContact> }) => api.patch(`/customers/${customerId}/contacts/${id}`, body),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const [removing, setRemoving] = useState<CustomerContact | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${customerId}/contacts/${id}`),
    onSuccess: () => (refresh(), setRemoving(null), toast.success("Contact removed")),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const render = (type: ContactType) => contacts.filter((c) => c.type === type);

  return (
    <Card
      title="Contacts" icon={Contact}
      actions={
        editable && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<ShadcnButton variant="outline" size="sm" />}>
              <Plus /> Add
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing({ type: "PHONE" })}>Phone number</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditing({ type: "EMAIL" })}>Email</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    >
      {(["PHONE", "EMAIL"] as const).map((type) =>
        render(type).length === 0 ? null : (
          <ul key={type} className="mb-3 space-y-3 last:mb-0">
            {render(type).map((c) => (
              <li key={c.id} className="flex items-start gap-3 text-sm">
                {type === "PHONE" ? <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={clsx("tabular font-medium", c.isOutdated && "text-muted-foreground line-through")}>
                      {type === "PHONE" ? phone(c.value) : c.value}
                    </span>
                    {c.label && <span className="text-xs text-muted-foreground">{c.label}</span>}
                    {c.isPrimary && <Badge tone="success">Primary</Badge>}
                    {c.isOutdated && <Badge tone="warning">Outdated</Badge>}
                  </div>
                  {c.remark && <p className="mt-0.5 text-xs text-muted-foreground">{c.remark}</p>}
                </div>
                {editable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<ShadcnButton variant="ghost" size="icon-sm" aria-label={`Actions for ${c.value}`} />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(c)}>Edit or add remark…</DropdownMenuItem>
                      {!c.isPrimary && (
                        <DropdownMenuItem onClick={() => patch.mutate({ id: c.id, body: { isPrimary: true } })}>
                          <Star /> Make primary
                        </DropdownMenuItem>
                      )}
                      {!c.isPrimary && (
                        <DropdownMenuItem onClick={() => patch.mutate({ id: c.id, body: { isOutdated: !c.isOutdated } })}>
                          {c.isOutdated ? "Mark as current" : "Mark as outdated"}
                        </DropdownMenuItem>
                      )}
                      {!(c.isPrimary && c.type === "PHONE") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setRemoving(c)}>
                            Remove
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        ),
      )}
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        The primary mobile identifies the customer for offers and OTPs. Keep old numbers as outdated so the customer can still be found by them.
      </p>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.type === "EMAIL" ? "this email" : "this number"}?`}
        description={
          <>
            <span className="font-mono text-foreground">{removing && (removing.type === "PHONE" ? phone(removing.value) : removing.value)}</span> will be deleted
            from this customer. To keep it for history, mark it as outdated instead.
          </>
        }
        confirmLabel="Remove contact"
        icon={<Trash2 className="size-4" />}
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />

      {editing && (
        <ContactDialog
          customerId={customerId}
          contact={"id" in editing ? editing : null}
          type={editing.type}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </Card>
  );
}

function ContactDialog({
  customerId,
  contact,
  type,
  onClose,
  onSaved,
}: {
  customerId: string;
  contact: CustomerContact | null;
  type: ContactType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(contact?.value ?? "");
  const [label, setLabel] = useState(contact?.label ?? LABELS[type][0]);
  const [remark, setRemark] = useState(contact?.remark ?? "");
  const [isOutdated, setIsOutdated] = useState(contact?.isOutdated ?? false);

  const save = useMutation({
    mutationFn: () => {
      const body = { value, label, remark: remark.trim() || null, ...(contact?.isPrimary ? {} : { isOutdated }) };
      return contact
        ? api.patch(`/customers/${customerId}/contacts/${contact.id}`, body)
        : api.post(`/customers/${customerId}/contacts`, { type, ...body });
    },
    onSuccess: () => {
      onSaved();
      onClose();
      toast.success(contact ? "Contact updated" : "Contact added");
    },
  });

  const noun = type === "PHONE" ? "phone number" : "email";
  return (
    <Modal
      open
      onClose={onClose}
      title={contact ? `Edit ${noun}` : `Add ${noun}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} disabled={value.trim().length < 3} onClick={() => save.mutate()}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field
            required
            label={type === "PHONE" ? "Number" : "Email"}
            hint={contact?.isPrimary && type === "PHONE" ? "This is the primary mobile, so it must be a valid 10-digit mobile." : type === "PHONE" ? "Any number: mobile, landline, international." : undefined}
          >
            <ContactValueInput
              type={type}
              primary={!!contact?.isPrimary}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="Label">
            <SelectInput value={label ?? ""} onValueChange={setLabel} options={LABELS[type].map((l) => ({ value: l, label: l }))} />
          </Field>
        </div>
        <Field label="Remark" hint="e.g. outdated contact, office hours only, husband's number">
          <Input maxLength={200} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </Field>
        {!contact?.isPrimary && <Checkbox label="Outdated (kept for history, not used to contact them)" checked={isOutdated} onCheckedChange={setIsOutdated} />}
      </div>
    </Modal>
  );
}

/** Phone input masked for the primary mobile (10 digits) or any number; plain email input otherwise. */
function ContactValueInput({ type, primary, ...props }: { type: ContactType; primary: boolean } & React.ComponentProps<"input">) {
  if (type === "EMAIL") return <Input autoFocus type="email" {...props} />;
  return <MaskedInput autoFocus mask={primary ? "mobile" : "phone"} {...props} />;
}
