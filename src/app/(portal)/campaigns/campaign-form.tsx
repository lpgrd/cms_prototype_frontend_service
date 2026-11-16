"use client";

import { Coins, Megaphone, Percent, ScrollText } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, Button, Card, Field, FormDateTimePicker, FormSelect, Input, RequiredNote, Textarea } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { toLocalInput } from "@/lib/format";
import type { CalculationBase, Campaign, ValueType } from "@/lib/types";

export interface CampaignFormValues {
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  discountType: ValueType;
  discountValue?: number;
  discountBase: CalculationBase;
  maxDiscountAmount?: number;
  minBillAmount?: number;
  rewardType: ValueType;
  rewardValue?: number;
  rewardBase: CalculationBase;
  maxRewardPoints?: number;
  maxRedemptionsPerInfluencer?: number;
  terms: string;
}

const toForm = (c?: Campaign): CampaignFormValues => ({
  name: c?.name ?? "",
  description: c?.description ?? "",
  startsAt: toLocalInput(c?.startsAt),
  endsAt: toLocalInput(c?.endsAt),
  discountType: c?.discountType ?? "PERCENTAGE",
  discountValue: c?.discountValue ?? undefined,
  discountBase: c?.discountBase ?? "MAKING_CHARGES",
  maxDiscountAmount: c?.maxDiscountAmount ?? undefined,
  minBillAmount: c?.minBillAmount ?? undefined,
  rewardType: c?.rewardType ?? "PERCENTAGE",
  rewardValue: c?.rewardValue ?? undefined,
  rewardBase: c?.rewardBase ?? "BILL_AMOUNT",
  maxRewardPoints: c?.maxRewardPoints ?? undefined,
  maxRedemptionsPerInfluencer: c?.maxRedemptionsPerInfluencer ?? undefined,
  terms: c?.terms ?? "",
});

const VALUE_TYPES = (flatLabel: string) => [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FLAT", label: flatLabel },
];

const numOrNull = (v: number | undefined) => (Number.isFinite(v) ? v : null);
const strOrNull = (v: string) => (v.trim() ? v.trim() : null);

/** Converts form values into the API payload (empty optional fields become null = "no limit"). */
export function toPayload(f: CampaignFormValues) {
  return {
    name: f.name.trim(),
    description: strOrNull(f.description),
    startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
    endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
    discountType: f.discountType,
    discountValue: Number.isFinite(f.discountValue) ? f.discountValue! : 0,
    discountBase: f.discountBase,
    maxDiscountAmount: numOrNull(f.maxDiscountAmount),
    minBillAmount: numOrNull(f.minBillAmount),
    rewardType: f.rewardType,
    rewardValue: Number.isFinite(f.rewardValue) ? f.rewardValue! : 0,
    rewardBase: f.rewardBase,
    maxRewardPoints: numOrNull(f.maxRewardPoints),
    maxRedemptionsPerInfluencer: numOrNull(f.maxRedemptionsPerInfluencer),
    terms: strOrNull(f.terms),
  };
}

export function CampaignForm({
  campaign,
  onSubmit,
  submitting,
  error,
  submitLabel,
  secondaryAction,
}: {
  campaign?: Campaign;
  onSubmit: (values: CampaignFormValues) => void;
  submitting: boolean;
  error: unknown;
  submitLabel: string;
  secondaryAction?: React.ReactNode;
}) {
  const { register, handleSubmit, control } = useForm<CampaignFormValues>({ values: toForm(campaign) });
  const [discountType, rewardType] = useWatch({ control, name: ["discountType", "rewardType"] });
  const apiErr = error instanceof ApiError ? error : null;
  const num = { valueAsNumber: true } as const;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {apiErr && <Alert tone="danger">{apiErr.message}</Alert>}

      <Card title="Campaign" icon={Megaphone}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2" error={apiErr?.field("name")}>
            <Input placeholder="e.g. Diwali Glow 2026" {...register("name", { required: true })} />
          </Field>
          <Field label="Description" className="sm:col-span-2" hint="Shown to customers on the QR landing page.">
            <Textarea rows={2} {...register("description")} />
          </Field>
          <Field label="Starts" hint="Leave empty to start as soon as it's active.">
            <FormDateTimePicker control={control} name="startsAt" placeholder="Start immediately" defaultTime="00:00" />
          </Field>
          <Field label="Ends" hint="Leave empty to run until you end it.">
            <FormDateTimePicker control={control} name="endsAt" placeholder="No end date" defaultTime="23:59" />
          </Field>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Customer discount" icon={Percent}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <FormSelect control={control} name="discountType" options={VALUE_TYPES("Flat amount")} />
            </Field>
            <Field label={discountType === "FLAT" ? "Amount (₹)" : "Percent (%)"} required>
              <Input type="number" step="0.01" min="0" {...register("discountValue", { ...num, required: true })} />
            </Field>
            <Field label="Calculated on" className="sm:col-span-2">
              <FormSelect
                control={control}
                name="discountBase"
                disabled={discountType === "FLAT"}
                options={[
                  { value: "MAKING_CHARGES", label: "Making charges only" },
                  { value: "BILL_AMOUNT", label: "Full bill (before tax)" },
                ]}
              />
            </Field>
            <Field label="Max discount (₹)" hint="Optional cap">
              <Input type="number" step="0.01" min="0" {...register("maxDiscountAmount", num)} />
            </Field>
            <Field label="Minimum bill (₹)" hint="Optional">
              <Input type="number" step="0.01" min="0" {...register("minBillAmount", num)} />
            </Field>
          </div>
        </Card>

        <Card title="Partner reward (points)" icon={Coins}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <FormSelect control={control} name="rewardType" options={VALUE_TYPES("Flat points per bill")} />
            </Field>
            <Field label={rewardType === "FLAT" ? "Points" : "Percent (%)"} required>
              <Input type="number" step="0.01" min="0" {...register("rewardValue", { ...num, required: true })} />
            </Field>
            <Field label="Calculated on" className="sm:col-span-2" hint="Bill amount is after the customer discount, before tax.">
              <FormSelect
                control={control}
                name="rewardBase"
                disabled={rewardType === "FLAT"}
                options={[
                  { value: "BILL_AMOUNT", label: "Bill amount" },
                  { value: "MAKING_CHARGES", label: "Making charges only" },
                ]}
              />
            </Field>
            <Field label="Max points per bill" hint="Optional cap">
              <Input type="number" step="0.01" min="0" {...register("maxRewardPoints", num)} />
            </Field>
            <Field label="Max customers per partner" hint="Optional">
              <Input type="number" step="1" min="1" {...register("maxRedemptionsPerInfluencer", num)} />
            </Field>
          </div>
        </Card>
      </div>

      <Card title="Terms" icon={ScrollText}>
        <Textarea rows={3} placeholder="Shown on the QR landing page" {...register("terms")} />
        <p className="mt-2 text-xs text-muted-foreground">Each mobile number can use an offer from this campaign once.</p>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <RequiredNote />
        <span className="flex-1" />
        {secondaryAction}
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
