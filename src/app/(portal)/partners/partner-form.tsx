"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Alert, Button, Field, FormSelect, Input, MaskedInput, Modal, RequiredNote, Textarea } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { PARTNER_TYPES } from "@/lib/format";
import type { Influencer, PartnerType } from "@/lib/types";

interface Form {
  type: PartnerType;
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;
  instagramHandle: string;
  youtubeChannel: string;
  followerCount?: number;
  status: string;
  upiId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  panNumber: string;
  notes: string;
}

const toForm = (i?: Influencer): Form => ({
  type: i?.type ?? "INFLUENCER",
  name: i?.name ?? "",
  contactPerson: i?.contactPerson ?? "",
  mobile: i?.mobile ?? "",
  email: i?.email ?? "",
  instagramHandle: i?.instagramHandle ?? "",
  youtubeChannel: i?.youtubeChannel ?? "",
  followerCount: i?.followerCount ?? undefined,
  status: i?.status ?? "ACTIVE",
  upiId: i?.upiId ?? "",
  bankAccountName: i?.bankAccountName ?? "",
  bankAccountNumber: i?.bankAccountNumber ?? "",
  bankIfsc: i?.bankIfsc ?? "",
  panNumber: i?.panNumber ?? "",
  notes: i?.notes ?? "",
});

const orNull = (v: string) => (v.trim() ? v.trim() : null);

export function PartnerFormButton({ influencer }: { influencer?: Influencer }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();
  const { register, handleSubmit, reset, control } = useForm<Form>({ values: toForm(influencer) });
  const type = useWatch({ control, name: "type" });
  const business = type === "BUSINESS";

  const save = useMutation({
    mutationFn: (f: Form) => {
      const body = {
        type: f.type,
        name: f.name.trim(),
        // Only businesses have a separate contact person; clear it if the type changes.
        contactPerson: f.type === "BUSINESS" ? orNull(f.contactPerson) : null,
        mobile: f.mobile,
        email: orNull(f.email),
        instagramHandle: orNull(f.instagramHandle),
        youtubeChannel: orNull(f.youtubeChannel),
        followerCount: Number.isFinite(f.followerCount) ? f.followerCount : null,
        upiId: orNull(f.upiId),
        bankAccountName: orNull(f.bankAccountName),
        bankAccountNumber: orNull(f.bankAccountNumber),
        bankIfsc: orNull(f.bankIfsc),
        panNumber: orNull(f.panNumber),
        notes: orNull(f.notes),
        ...(influencer ? { status: f.status } : {}),
      };
      return influencer
        ? api.patch<Influencer>(`/influencers/${influencer.id}`, body)
        : api.post<Influencer>("/influencers", body);
    },
    onSuccess: (i) => {
      qc.invalidateQueries({ queryKey: ["influencers"] });
      qc.invalidateQueries({ queryKey: ["influencer", i.id] });
      setOpen(false);
      toast.success(influencer ? "Partner updated" : "Partner added");
      if (!influencer) router.push(`/partners/${i.id}`);
    },
  });
  const err = save.error instanceof ApiError ? save.error : null;

  return (
    <>
      {influencer ? (
        <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setOpen(true)}>Edit</Button>
      ) : (
        <Button icon={<Plus className="size-4" />} onClick={() => (reset(toForm()), setOpen(true))}>Add partner</Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={influencer ? "Edit partner" : "Add partner"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={save.isPending} onClick={handleSubmit((f) => save.mutate(f))}>Save</Button>
          </>
        }
      >
        {save.isError && <div className="mb-4"><Alert tone="danger">{errorMessage(save.error)}</Alert></div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" required hint="Every type gets codes, points and payouts the same way.">
            <FormSelect control={control} name="type" options={[...PARTNER_TYPES]} />
          </Field>
          <Field label={business ? "Business name" : "Name"} required error={err?.field("name")}>
            <Input placeholder={business ? "e.g. Shubh Wedding Planners" : undefined} {...register("name", { required: true })} />
          </Field>
          {business && (
            <Field label="Contact person" error={err?.field("contactPerson")}><Input {...register("contactPerson")} /></Field>
          )}
          <Field label="Mobile" required error={err?.field("mobile")}><MaskedInput mask="mobile" {...register("mobile", { required: true })} /></Field>
          <Field label="Email" error={err?.field("email")}><Input type="email" {...register("email")} /></Field>
          <Field label="Instagram handle"><Input placeholder="@handle" {...register("instagramHandle")} /></Field>
          {type === "INFLUENCER" && (
            <>
              <Field label="YouTube channel"><Input {...register("youtubeChannel")} /></Field>
              <Field label="Followers"><Input type="number" min="0" {...register("followerCount", { valueAsNumber: true })} /></Field>
            </>
          )}
          {influencer && (
            <Field label="Status">
              <FormSelect
                control={control}
                name="status"
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive (all codes stop working)" },
                ]}
              />
            </Field>
          )}
        </div>
        <h3 className="mb-3 mt-6 text-sm font-semibold">Payout details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="UPI ID" error={err?.field("upiId")}><Input placeholder="name@bank" {...register("upiId")} /></Field>
          <Field label="PAN" error={err?.field("panNumber")} hint="Needed before paying out (TDS)."><MaskedInput mask="pan" placeholder="ABCDE1234F" {...register("panNumber")} /></Field>
          <Field label="Account holder"><Input {...register("bankAccountName")} /></Field>
          <Field label="Account number" error={err?.field("bankAccountNumber")}><MaskedInput mask="digits" maxLength={18} {...register("bankAccountNumber")} /></Field>
          <Field label="IFSC" error={err?.field("bankIfsc")}><MaskedInput mask="ifsc" placeholder="HDFC0001234" {...register("bankIfsc")} /></Field>
        </div>
        <Field label="Notes" className="mt-4"><Textarea rows={2} {...register("notes")} /></Field>
        <div className="mt-4">
          <RequiredNote />
        </div>
      </Modal>
    </>
  );
}
