"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  FormDatePicker,
  FormSelect,
  Input,
  MaskedInput,
  Modal,
  RequiredNote,
  Textarea,
} from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { sourceLabel } from "@/lib/format";
import type { ContactType, Customer } from "@/lib/types";

interface Form {
  mobile: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  anniversaryDate: string;
  address: string;
  city: string;
  pincode: string;
  source: string;
  tags: string;
  notes: string;
  panNumber: string;
  /** Extra phones/emails (create only; afterwards they're managed in the Contacts card). */
  contacts: { type: ContactType; value: string; label: string; remark: string; isOutdated: boolean }[];
}

const toForm = (c?: Customer): Form => ({
  mobile: c?.mobile ?? "",
  name: c?.name ?? "",
  email: c?.email ?? "",
  gender: c?.gender ?? "",
  dateOfBirth: c?.dateOfBirth ?? "",
  anniversaryDate: c?.anniversaryDate ?? "",
  address: c?.address ?? "",
  city: c?.city ?? "",
  pincode: c?.pincode ?? "",
  source: c?.source ?? "WALK_IN",
  tags: c?.tags.join(", ") ?? "",
  notes: c?.notes ?? "",
  panNumber: c?.panNumber ?? "",
  contacts: [],
});

const orNull = (v: string) => (v.trim() ? v.trim() : null);

/** Create (no customer) or edit (customer given) button + modal. */
export function CustomerFormButton({ customer, compact }: { customer?: Customer; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const { register, handleSubmit, reset, control } = useForm<Form>({ values: toForm(customer) });
  const extra = useFieldArray({ control, name: "contacts" });

  const save = useMutation({
    mutationFn: (f: Form) => {
      const body = {
        // Mobile and email are changed through the Contacts card once the customer exists.
        ...(customer
          ? {}
          : {
              mobile: f.mobile,
              email: orNull(f.email),
              contacts: f.contacts
                .filter((c) => c.value.trim())
                .map((c) => ({
                  type: c.type,
                  value: c.value.trim(),
                  label: c.label || null,
                  remark: orNull(c.remark),
                  isOutdated: c.isOutdated,
                })),
            }),
        name: f.name.trim(),
        gender: orNull(f.gender),
        dateOfBirth: orNull(f.dateOfBirth),
        anniversaryDate: orNull(f.anniversaryDate),
        address: orNull(f.address),
        city: orNull(f.city),
        pincode: orNull(f.pincode),
        source: f.source,
        tags: f.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: orNull(f.notes),
        panNumber: f.panNumber.trim() ? f.panNumber.trim().toUpperCase() : null,
      };
      return customer ? api.patch<Customer>(`/customers/${customer.id}`, body) : api.post<Customer>("/customers", body);
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", c.id] });
      qc.invalidateQueries({ queryKey: ["customer-lookup"] });
      setOpen(false);
      toast.success(customer ? "Customer updated" : "Customer added");
      if (!customer) router.push(`/customers/${c.id}`);
    },
  });

  const err = save.error instanceof ApiError ? save.error : null;

  return (
    <>
      {customer ? (
        <Button
          variant={compact ? "ghost" : "secondary"}
          size={compact ? "sm" : "md"}
          icon={<Pencil className="size-4" />}
          onClick={() => setOpen(true)}
        >
          {compact ? "Edit details" : "Edit"}
        </Button>
      ) : (
        <Button icon={<Plus className="size-4" />} onClick={() => (reset(toForm()), setOpen(true))}>
          Add customer
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={customer ? "Edit customer" : "Add customer"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>
              Save
            </Button>
          </>
        }
      >
        {save.isError && (
          <div className="mb-4">
            <Alert tone="danger">{errorMessage(save.error)}</Alert>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {!customer && (
            <Field label="Mobile" required error={err?.field("mobile")} hint="Primary number: used for offers and OTPs.">
              <MaskedInput mask="mobile" placeholder="9876543210" {...register("mobile", { required: true })} />
            </Field>
          )}
          <Field label="Name" required error={err?.field("name")}>
            <Input {...register("name", { required: true })} />
          </Field>
          {!customer && (
            <Field label="Email" error={err?.field("email")}>
              <Input type="email" {...register("email")} />
            </Field>
          )}
          <Field label="Gender">
            <FormSelect
              control={control}
              name="gender"
              placeholder="Not specified"
              options={[
                { value: "", label: "Not specified" },
                { value: "FEMALE", label: "Female" },
                { value: "MALE", label: "Male" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Birthday">
            <FormDatePicker control={control} name="dateOfBirth" toYear={new Date().getFullYear()} />
          </Field>
          <Field label="Anniversary">
            <FormDatePicker control={control} name="anniversaryDate" toYear={new Date().getFullYear()} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Textarea rows={2} {...register("address")} />
          </Field>
          <Field label="City">
            <Input {...register("city")} />
          </Field>
          <Field label="Pincode" error={err?.field("pincode")}>
            <MaskedInput mask="digits" maxLength={6} {...register("pincode")} />
          </Field>
          <Field label="PAN" error={err?.field("panNumber")} hint="Needed for bills above ₹2 lakh.">
            <MaskedInput mask="pan" placeholder="ABCDE1234F" {...register("panNumber")} />
          </Field>
          <Field label="Source">
            <FormSelect
              control={control}
              name="source"
              options={["WALK_IN", "INFLUENCER", "REFERRAL", "ONLINE", "OTHER"].map((s) => ({ value: s, label: sourceLabel(s) }))}
            />
          </Field>
          <Field label="Tags" hint="Comma separated, e.g. bridal, VIP">
            <Input {...register("tags")} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} {...register("notes")} />
          </Field>
        </div>

        {customer ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Phone numbers and emails are edited in the Contacts card on the customer&apos;s page.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Other contacts <span className="font-normal text-muted-foreground">(optional)</span>
              </h3>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={<Plus className="size-4" />}
                  onClick={() => extra.append({ type: "PHONE", value: "", label: "Mobile", remark: "", isOutdated: false })}
                >
                  Phone
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={<Plus className="size-4" />}
                  onClick={() => extra.append({ type: "EMAIL", value: "", label: "Work", remark: "", isOutdated: false })}
                >
                  Email
                </Button>
              </div>
            </div>
            {extra.fields.map((field, i) => (
              <div key={field.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_7rem_1fr_auto]">
                {field.type === "PHONE" ? (
                  <MaskedInput mask="phone" placeholder="Number" aria-label="Phone number" {...register(`contacts.${i}.value`)} />
                ) : (
                  <Input type="email" placeholder="Email" aria-label="Email" {...register(`contacts.${i}.value`)} />
                )}
                <FormSelect
                  control={control}
                  name={`contacts.${i}.label`}
                  options={(field.type === "PHONE"
                    ? ["Mobile", "WhatsApp", "Landline", "Work", "Home", "Old", "Other"]
                    : ["Personal", "Work", "Other"]
                  ).map((l) => ({ value: l, label: l }))}
                />
                <Input
                  placeholder="Remark, e.g. outdated contact"
                  aria-label="Remark"
                  maxLength={200}
                  {...register(`contacts.${i}.remark`)}
                />
                <Button type="button" variant="ghost" size="sm" aria-label="Remove contact" onClick={() => extra.remove(i)}>
                  <Trash2 className="size-4" />
                </Button>
                <div className="sm:col-span-4">
                  <Controller
                    control={control}
                    name={`contacts.${i}.isOutdated`}
                    render={({ field: f }) => <Checkbox label="Outdated" checked={!!f.value} onCheckedChange={f.onChange} />}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <RequiredNote />
        </div>
      </Modal>
    </>
  );
}
