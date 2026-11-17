"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  BadgePercent,
  Calculator,
  Gem,
  MessageSquareText,
  Plus,
  ScanLine,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { QrScannerModal } from "@/components/qr-scanner";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  FormDatePicker,
  FormSelect,
  InlineLoading,
  Input,
  MaskedInput,
  PageHeader,
  RequiredNote,
  Textarea,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { codeFromScan } from "@/lib/partner-code";
import { date, inr, inrShort, plural, points } from "@/lib/format";
import type { BillPreview, Customer, MetalType, OtpChallenge, Transaction } from "@/lib/types";
import { useDebounced } from "@/hooks/use-debounced";
import { useCan } from "@/providers/auth";
import { CustomerFormButton } from "../customers/customer-form";
import { CustomerMobileInput } from "@/components/customer-mobile-input";
import { paidSoFar, PaymentSection, type PaymentFormValues } from "./payment-section";

interface ItemForm {
  description: string;
  metalType: MetalType;
  purity: string;
  huid: string;
  // Empty number inputs are undefined (initially) or NaN (after clearing, via valueAsNumber).
  grossWeight?: number;
  netWeight?: number;
  ratePerGram?: number;
  makingCharges?: number;
  stoneCharges?: number;
}

interface BillForm {
  mobile: string;
  name: string;
  email: string;
  dateOfBirth: string;
  anniversaryDate: string;
  panNumber: string;
  marketingConsent: boolean;
  code: string;
  otp: string;
  items: ItemForm[];
  notes: string;
}
type BillFormValues = BillForm & PaymentFormValues;

const METALS: MetalType[] = ["GOLD", "SILVER", "PLATINUM", "DIAMOND", "OTHER"];
const METAL_OPTIONS = METALS.map((m) => ({ value: m, label: m.charAt(0) + m.slice(1).toLowerCase() }));
const PAN_ISSUES = new Set(["PAN_REQUIRED", "PAN_INVALID"]);
/** Shown by the payment section itself, not as alerts. */
const PAYMENT_ISSUES = new Set(["PAYMENT_MISSING", "PAYMENT_SHORT", "PAYMENT_OVER"]);

const emptyItem = (metalType: MetalType = "GOLD", ratePerGram?: number): ItemForm => ({
  description: "",
  metalType,
  purity: metalType === "GOLD" ? "22K" : "",
  huid: "",
  ratePerGram,
});

const digits = (v: string) => v.replace(/\D/g, "").slice(-10);
const isMobile = (v: string) => /^[6-9]\d{9}$/.test(digits(v));
const n = (v: number | undefined) => (Number.isFinite(v) ? (v as number) : 0);
const upper = (v: string | undefined) => v?.trim().toUpperCase() || undefined;

export default function BillingPage() {
  const router = useRouter();
  const can = useCan();
  const [scanOpen, setScanOpen] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<(OtpChallenge & { key: string }) | null>(null);
  const { register, control, handleSubmit, setValue, getValues, reset } = useForm<BillFormValues>({
    defaultValues: {
      mobile: "",
      name: "",
      email: "",
      dateOfBirth: "",
      anniversaryDate: "",
      panNumber: "",
      marketingConsent: false,
      code: "",
      otp: "",
      items: [emptyItem()],
      split: false,
      paymentMode: "UPI",
      paymentReference: "",
      payments: [],
      notes: "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watched = useWatch({ control });

  const mobile = digits(watched.mobile ?? "");
  const mobileValid = isMobile(mobile);

  const lookup = useQuery({
    queryKey: ["customer-lookup", mobile],
    queryFn: () => api.get<{ customer: Customer | null }>("/customers/lookup", { mobile }),
    enabled: mobileValid,
  });
  const existing = lookup.data?.customer ?? null;

  // Pre-tick consent with what we already know about the customer.
  useEffect(() => {
    if (lookup.isSuccess) setValue("marketingConsent", existing?.marketingConsent ?? false);
  }, [lookup.isSuccess, existing, setValue]);

  // Only complete lines count towards the preview; lineIndex maps each form row to its position in the preview.
  const { validItems, lineIndex } = useMemo(() => {
    const items = watched.items ?? [];
    const lineIndex: number[] = [];
    const validItems = [];
    for (const i of items) {
      const complete = !!i?.description?.trim() && Number.isFinite(i.netWeight) && Number.isFinite(i.ratePerGram);
      lineIndex.push(complete ? validItems.length : -1);
      if (!complete) continue;
      validItems.push({
        description: i!.description!.trim(),
        metalType: i!.metalType!,
        purity: i!.purity || undefined,
        huid: upper(i!.huid),
        grossWeight: n(i!.grossWeight) || n(i!.netWeight),
        netWeight: n(i!.netWeight),
        ratePerGram: n(i!.ratePerGram),
        makingCharges: n(i!.makingCharges),
        stoneCharges: n(i!.stoneCharges),
      });
    }
    return { validItems, lineIndex };
  }, [watched.items]);

  const code = (watched.code ?? "").trim();
  const panNumber = upper(watched.panNumber);
  // What the payment section holds, in the API's shape: a split as lines (only those with an amount), else one mode.
  const payments = watched.split
    ? (watched.payments ?? [])
        .filter((p) => Number.isFinite(p?.amount) && (p?.amount ?? 0) > 0)
        .map((p) => ({ method: p!.method!, amount: p!.amount!, reference: p!.reference?.trim() || undefined }))
    : undefined;
  const paymentMode = watched.split ? undefined : watched.paymentMode;

  const previewInput = useDebounced({ mobile, items: validItems, code, paymentMode, payments, panNumber });
  const preview = useQuery({
    queryKey: ["bill-preview", previewInput],
    queryFn: () =>
      api.post<BillPreview>("/transactions/preview", {
        customer: { mobile: previewInput.mobile, panNumber: previewInput.panNumber },
        items: previewInput.items,
        code: previewInput.code || undefined,
        paymentMode: previewInput.paymentMode,
        payments: previewInput.payments?.length ? previewInput.payments : undefined,
      }),
    enabled: isMobile(previewInput.mobile) && previewInput.items.length > 0,
    placeholderData: (prev) => prev,
  });

  const totals = preview.data?.totals;
  const offer = code ? preview.data?.offer : null;
  const codeError = code ? preview.data?.codeError : null;
  const issues = preview.data?.compliance ?? [];
  const billIssues = issues.filter((i) => i.itemIndex === undefined && !PAYMENT_ISSUES.has(i.code));
  const needsPan = issues.some((i) => PAN_ISSUES.has(i.code)) || !!panNumber;
  const otpRequired = !!offer && !!preview.data?.otpRequired;
  // An OTP is only valid for the mobile + code it was sent for.
  const otpKey = `${mobile}|${offer?.code ?? ""}`;
  const activeOtp = otpChallenge?.key === otpKey ? otpChallenge : null;

  const sendOtp = useMutation({
    mutationFn: () => api.post<OtpChallenge>("/transactions/redemption-otp", { mobile, code }),
    onSuccess: (res) => {
      setOtpChallenge({ ...res, key: otpKey });
      setValue("otp", "");
      toast.success(res.devCode ? `OTP sent. Dev mode code: ${res.devCode}` : "OTP sent to the customer's mobile");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const create = useMutation({
    mutationFn: (values: BillFormValues) =>
      api.post<Transaction>("/transactions", {
        customer: {
          mobile: digits(values.mobile),
          name: values.name.trim() || undefined,
          email: values.email.trim() || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
          anniversaryDate: values.anniversaryDate || undefined,
          panNumber: upper(values.panNumber),
          // Only send a consent decision when it changes what we have on file.
          marketingConsent: values.marketingConsent !== (existing?.marketingConsent ?? false) ? values.marketingConsent : undefined,
        },
        items: validItems,
        code: values.code.trim() || undefined,
        otpChallengeId: otpRequired ? activeOtp?.challengeId : undefined,
        otp: otpRequired ? values.otp.trim() : undefined,
        ...(values.split
          ? { payments }
          : { paymentMode: values.paymentMode, paymentReference: values.paymentReference.trim() || undefined }),
        notes: values.notes.trim() || undefined,
      }),
    onSuccess: (tx) => {
      toast.success(`Bill ${tx.invoiceNumber} saved`);
      reset();
      setOtpChallenge(null);
      router.push(`/transactions/${tx.id}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const onSubmit = handleSubmit((values) => {
    if (!mobileValid) return toast.error("Enter a valid 10-digit mobile number");
    if (!existing && !values.name.trim()) return toast.error("Enter the new customer's name");
    if (validItems.length === 0) return toast.error("Add at least one item with weight and rate");
    if (validItems.length !== values.items.length) return toast.error("Complete or remove the unfinished item rows");
    if (code && codeError) return toast.error(`Remove the code or fix it: ${codeError.message}`);
    if (values.split) {
      const paid = paidSoFar(values.payments);
      if (totals && Math.abs(paid - totals.grandTotal) >= 0.005) {
        return toast.error(
          paid < totals.grandTotal
            ? `${inr(totals.grandTotal - paid)} still to collect`
            : `Payments are ${inr(paid - totals.grandTotal)} more than the bill`,
        );
      }
    }
    if (issues.length) return toast.error(issues[0].message);
    if (otpRequired && (!activeOtp || !/^\d{6}$/.test(values.otp.trim()))) {
      return toast.error("Send an OTP and enter the code the customer received");
    }
    create.mutate(values);
  });

  const addItem = () => {
    const items = getValues("items");
    const last = items[items.length - 1];
    append(emptyItem(last?.metalType ?? "GOLD", Number.isFinite(last?.ratePerGram) ? last?.ratePerGram : undefined));
  };

  return (
    <>
      <PageHeader title="New bill" description="Scan the partner QR (if any), add items and save." />
      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Customer */}
          <Card title="Customer" icon={UserRound}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile number" required hint="Type part of the number to find a customer. New numbers start a new profile.">
                <CustomerMobileInput
                  field={register("mobile")}
                  value={mobile}
                  onPick={(m) => setValue("mobile", m, { shouldDirty: true })}
                  autoFocus
                />
              </Field>
              <div className="flex items-end">
                {mobileValid && lookup.isSuccess && existing && (
                  <div className="flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
                    <UserCheck className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{existing.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {plural(existing.purchaseCount, "purchase")}, {inrShort(existing.totalSpend)} spent, last on{" "}
                        {date(existing.lastPurchaseAt)}
                      </div>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      {can("customers.edit") && <CustomerFormButton customer={existing} compact />}
                      {can("customers.view") && (
                        <Link href={`/customers/${existing.id}`} target="_blank" className="text-xs text-primary hover:underline">
                          Profile
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                {mobileValid && lookup.isSuccess && !existing && (
                  <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
                    <UserPlus className="size-4" /> New customer. Add their details below.
                  </div>
                )}
              </div>
            </div>
            {mobileValid && lookup.isSuccess && !existing && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Name" required>
                  <Input {...register("name")} />
                </Field>
                <Field label="Email (optional)">
                  <Input type="email" {...register("email")} />
                </Field>
                <Field label="Birthday (optional)">
                  <FormDatePicker control={control} name="dateOfBirth" toYear={new Date().getFullYear()} />
                </Field>
                <Field label="Anniversary (optional)">
                  <FormDatePicker control={control} name="anniversaryDate" toYear={new Date().getFullYear()} />
                </Field>
              </div>
            )}
            {mobileValid && lookup.isSuccess && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {needsPan && !preview.data?.panOnFile ? (
                  <Field
                    required
                    label="PAN"
                    error={issues.find((i) => PAN_ISSUES.has(i.code))?.message}
                    hint="Required for bills above ₹2 lakh (Rule 114B)."
                  >
                    <MaskedInput mask="pan" placeholder="ABCDE1234F" {...register("panNumber")} />
                  </Field>
                ) : existing?.panNumber ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary" /> PAN on file ({existing.panNumber.slice(0, 2)}•••••
                    {existing.panNumber.slice(-3)})
                  </p>
                ) : (
                  <div />
                )}
                <div className="flex items-end pb-1">
                  <Controller
                    control={control}
                    name="marketingConsent"
                    render={({ field }) => (
                      <Checkbox
                        label="Customer agrees to receive offers and updates by SMS/WhatsApp"
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Partner code */}
          <Card title="Partner offer" icon={BadgePercent}>
            <div className="flex gap-2">
              <Input
                placeholder="Scan QR or type code"
                className="font-mono"
                // USB scanners type the whole QR link into the field; keep just the code.
                {...register("code", { onChange: (e) => setValue("code", codeFromScan(e.target.value)) })}
              />
              <Button type="button" variant="secondary" icon={<ScanLine className="size-4" />} onClick={() => setScanOpen(true)}>
                Scan
              </Button>
              {code && (
                <Button type="button" variant="ghost" aria-label="Remove code" onClick={() => setValue("code", "")}>
                  <X className="size-4" />
                </Button>
              )}
            </div>
            {code && !mobileValid && (
              <p className="mt-2 text-xs text-muted-foreground">Enter the customer&apos;s mobile to validate the code.</p>
            )}
            {offer && (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <BadgePercent className="mt-0.5 size-4 text-primary" />
                <div className="text-sm">
                  <div className="font-medium text-foreground">{offer.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {offer.campaign.name} via {offer.influencer.name}, code <span className="font-mono">{offer.code}</span>
                  </div>
                </div>
              </div>
            )}
            {otpRequired && (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquareText className="size-4" /> Verify the customer&apos;s mobile
                </div>
                <p className="text-xs text-muted-foreground">
                  We text a one-time code to +91 {mobile}. The offer applies only after the customer reads it out.
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" loading={sendOtp.isPending} onClick={() => sendOtp.mutate()}>
                    {activeOtp ? "Resend OTP" : "Send OTP"}
                  </Button>
                  {activeOtp && (
                    <MaskedInput
                      mask="digits"
                      aria-label="6-digit code"
                      autoComplete="one-time-code"
                      placeholder="6-digit code"
                      maxLength={6}
                      className="max-w-40 font-mono tracking-widest"
                      {...register("otp")}
                    />
                  )}
                </div>
              </div>
            )}
            {codeError && (
              <div className="mt-3">
                <Alert tone="danger">{codeError.message}</Alert>
              </div>
            )}
          </Card>

          {/* Items */}
          <Card
            title="Items"
            icon={Gem}
            actions={
              <Button type="button" size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={addItem}>
                Add item
              </Button>
            }
          >
            <div className="space-y-4">
              {fields.map((field, index) => {
                const line = lineIndex[index] >= 0 ? totals?.lines[lineIndex[index]] : undefined;
                const itemIssue = lineIndex[index] >= 0 ? issues.find((i) => i.itemIndex === lineIndex[index]) : undefined;
                return (
                  <div key={field.id} className={clsx("rounded-lg border p-4", itemIssue ? "border-destructive/50" : "border-border")}>
                    <div className="flex items-end gap-3">
                      <Field label="Description" required className="flex-1">
                        <Input placeholder="e.g. Temple necklace" {...register(`items.${index}.description`)} />
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Remove item"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    {/* Three columns keep labels on one line: identity, then weights, then charges. */}
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Field label="Metal" required>
                        <FormSelect control={control} name={`items.${index}.metalType`} options={METAL_OPTIONS} />
                      </Field>
                      <Field label="Purity">
                        <Input placeholder="22K" {...register(`items.${index}.purity`)} />
                      </Field>
                      <Field label="HUID" hint={watched.items?.[index]?.metalType === "GOLD" ? "Hallmark ID" : undefined}>
                        <MaskedInput mask="huid" placeholder="AB12CD" aria-invalid={!!itemIssue} {...register(`items.${index}.huid`)} />
                      </Field>
                      <Field label="Gross wt (g)">
                        <Input type="number" step="0.001" min="0" {...register(`items.${index}.grossWeight`, { valueAsNumber: true })} />
                      </Field>
                      <Field label="Net wt (g)" required>
                        <Input type="number" step="0.001" min="0" {...register(`items.${index}.netWeight`, { valueAsNumber: true })} />
                      </Field>
                      <Field label="Rate / g (₹)" required>
                        <Input type="number" step="0.01" min="0" {...register(`items.${index}.ratePerGram`, { valueAsNumber: true })} />
                      </Field>
                      <Field label="Making (₹)">
                        <Input type="number" step="0.01" min="0" {...register(`items.${index}.makingCharges`, { valueAsNumber: true })} />
                      </Field>
                      <Field label="Stones (₹)">
                        <Input type="number" step="0.01" min="0" {...register(`items.${index}.stoneCharges`, { valueAsNumber: true })} />
                      </Field>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-destructive">{itemIssue?.message}</span>
                      <span className="text-sm">
                        <span className="text-muted-foreground">Line total </span>
                        <span className="tabular font-semibold">{line ? inr(line.lineTotal) : "—"}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Below xl the summary sits after the items, so keep the running total in view while adding them. */}
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:hidden">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="tabular truncate text-xl font-semibold tracking-tight">{inr(totals?.grandTotal)}</div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => document.getElementById("bill-summary")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Review and save
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div id="bill-summary" className="scroll-mt-16 xl:sticky xl:top-16 xl:self-start">
          <Card title="Summary" icon={Calculator} actions={preview.isFetching ? <InlineLoading>Updating…</InlineLoading> : undefined}>
            <dl
              className={clsx("tabular space-y-2 text-sm transition-opacity", preview.isFetching && "opacity-50")}
              aria-busy={preview.isFetching}
            >
              <Row label="Subtotal" value={inr(totals?.subtotal)} />
              <Row label="Making charges" value={inr(totals?.makingChargesTotal)} muted />
              <Row
                label="Partner discount"
                value={totals?.discountAmount ? `− ${inr(totals.discountAmount)}` : inr(0)}
                highlight={!!totals?.discountAmount}
              />
              <Row label="Taxable amount" value={inr(totals?.taxableAmount)} />
              <Row label={`GST (${totals?.taxRate ?? "—"}%)`} value={inr(totals?.taxAmount)} />
              {!!totals?.roundOff && <Row label="Round off" value={inr(totals.roundOff)} muted />}
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="text-2xl font-semibold tracking-tight sm:text-3xl">{inr(totals?.grandTotal)}</dd>
              </div>
              {!!totals?.pointsAwarded && offer && (
                <div className="flex justify-end">
                  <Badge tone="gold">
                    {offer.influencer.name} earns {points(totals.pointsAwarded)}
                  </Badge>
                </div>
              )}
            </dl>

            <div className="mt-5 space-y-4">
              <PaymentSection control={control} register={register} setValue={setValue} total={totals?.grandTotal} />
              <Field label="Notes (optional)">
                <Textarea rows={2} {...register("notes")} />
              </Field>
              {billIssues.map((i) => (
                <Alert key={i.code} tone="danger">
                  {i.message}
                </Alert>
              ))}
              <Button type="submit" className="w-full" loading={create.isPending} disabled={!totals || issues.length > 0}>
                Save bill
              </Button>
              <RequiredNote />
              {preview.isError && <Alert tone="danger">{errorMessage(preview.error)}</Alert>}
            </div>
          </Card>
        </div>
      </form>

      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(text) => {
          setValue("code", codeFromScan(text), { shouldDirty: true });
          setScanOpen(false);
          toast.success("Code scanned");
        }}
      />
    </>
  );
}

function Row({ label, value, muted, highlight }: { label: string; value: string; muted?: boolean; highlight?: boolean }) {
  return (
    <div className={clsx("flex justify-between", muted && "text-muted-foreground", highlight && "font-medium text-primary")}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
