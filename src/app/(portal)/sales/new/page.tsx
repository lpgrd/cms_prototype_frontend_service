"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, BadgePercent, CalendarClock, HandCoins, MessageSquareText, ReceiptIndianRupee, ScanLine, UserCheck, UserPlus, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CustomerMobileInput } from "@/components/customer-mobile-input";
import { QrScannerModal } from "@/components/qr-scanner";
import { Alert, Badge, Button, Card, Empty, Field, Input, MaskedInput, PageHeader, RequiredNote, Textarea } from "@/components/ui";
import { useDebounced } from "@/hooks/use-debounced";
import { api, errorMessage } from "@/lib/api";
import { codeFromScan } from "@/lib/partner-code";
import { date, inr, partnerTypeLabel, points } from "@/lib/format";
import type { Customer, OtpChallenge, PartnerSale, SalePreview } from "@/lib/types";

interface SaleForm {
  // Empty number inputs are undefined (initially) or NaN (after clearing, via valueAsNumber).
  billAmount?: number;
  makingCharges?: number;
  code: string;
  billReference: string;
  mobile: string;
  name: string;
  otp: string;
  notes: string;
}

// NaN, not undefined, so reset() actually empties the number fields.
const EMPTY: SaleForm = { billAmount: NaN, makingCharges: NaN, code: "", billReference: "", mobile: "", name: "", otp: "", notes: "" };

const digits = (v: string) => v.replace(/\D/g, "").slice(-10);
const isMobile = (v: string) => /^[6-9]\d{9}$/.test(v);
const amount = (v: number | undefined) => (Number.isFinite(v) && (v as number) > 0 ? (v as number) : undefined);

export default function PartnerSalePage() {
  const qc = useQueryClient();
  const [scanOpen, setScanOpen] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<(OtpChallenge & { key: string }) | null>(null);
  const { register, control, handleSubmit, setValue, reset, setFocus } = useForm<SaleForm>({ defaultValues: EMPTY });
  const watched = useWatch({ control });

  const billAmount = amount(watched.billAmount);
  const makingCharges = Number.isFinite(watched.makingCharges) ? watched.makingCharges : undefined;
  const code = (watched.code ?? "").trim();
  const mobile = digits(watched.mobile ?? "");
  const mobileValid = isMobile(mobile);

  const previewInput = useDebounced({ code, billAmount, makingCharges, mobile: mobileValid ? mobile : undefined });
  const preview = useQuery({
    queryKey: ["sale-preview", previewInput],
    queryFn: () => api.post<SalePreview>("/partner-sales/preview", { ...previewInput, billAmount: previewInput.billAmount ?? 1 }),
    enabled: !!previewInput.code,
    placeholderData: (prev) => prev,
  });
  // The preview always needs an amount, so without one it only identifies the partner.
  const data = code ? preview.data : undefined;
  const offer = data?.offer ?? null;
  const amounts = billAmount ? (data?.amounts ?? null) : null;
  const codeError = billAmount || !data?.offer ? (data?.codeError ?? null) : null;

  const lookup = useQuery({
    queryKey: ["customer-lookup", mobile],
    queryFn: () => api.get<{ customer: Customer | null }>("/customers/lookup", { mobile }),
    enabled: mobileValid,
  });
  const existing = lookup.data?.customer ?? null;

  const otpRequired = !!offer && !!data?.otpRequired;
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

  const record = useMutation({
    mutationFn: (values: SaleForm) =>
      api.post<PartnerSale>("/partner-sales", {
        code: values.code.trim(),
        billAmount,
        makingCharges: data?.makingChargesRequired ? makingCharges : undefined,
        mobile: mobileValid ? mobile : undefined,
        name: mobileValid && !existing ? values.name.trim() || undefined : undefined,
        billReference: values.billReference.trim() || undefined,
        notes: values.notes.trim() || undefined,
        otpChallengeId: otpRequired ? activeOtp?.challengeId : undefined,
        otp: otpRequired ? values.otp.trim() : undefined,
      }),
    onSuccess: (sale) => {
      toast.success(`Sale #${sale.number} recorded: ${sale.influencer?.name} earns ${points(sale.pointsAwarded)}`);
      qc.invalidateQueries({ queryKey: ["partner-sales"] });
      reset(EMPTY);
      setOtpChallenge(null);
      setFocus("billAmount");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const onSubmit = handleSubmit((values) => {
    if (!billAmount) return toast.error("Enter the bill amount");
    if (!code) return toast.error("Scan the partner's QR or type their code");
    if (codeError) return toast.error(codeError.message);
    if (data?.makingChargesRequired && makingCharges === undefined) return toast.error("Enter the making charges in this bill");
    if (values.mobile.trim() && !mobileValid) return toast.error("Enter a valid 10-digit mobile number, or leave it empty");
    if (mobileValid && lookup.isSuccess && !existing && !values.name.trim()) return toast.error("Enter the new customer's name");
    if (otpRequired && !mobileValid) return toast.error("Enter the customer's mobile to send them an OTP");
    if (otpRequired && (!activeOtp || !/^\d{6}$/.test(values.otp.trim()))) {
      return toast.error("Send an OTP and enter the code the customer received");
    }
    record.mutate(values);
  });

  return (
    <>
      <PageHeader
        title="Partner sale"
        description="Enter the bill amount from your billing system, then scan the partner's QR."
        actions={
          <Link href="/sales">
            <Button variant="secondary" icon={<ReceiptIndianRupee className="size-4" />}>All sales</Button>
          </Link>
        }
      />
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Bill" icon={ReceiptIndianRupee}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bill amount (₹)" required hint="The bill total before the partner discount.">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  autoFocus
                  className="tabular h-11 text-lg font-semibold"
                  {...register("billAmount", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Bill number" hint="From your billing system, to match the two up.">
                <Input placeholder="e.g. INV/2026/0412" {...register("billReference")} />
              </Field>
            </div>

            <Field label="Partner code" required className="mt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Scan QR or type code"
                  className="font-mono uppercase"
                  // USB scanners type the whole QR link into the field; keep just the code.
                  {...register("code", { onChange: (e) => setValue("code", codeFromScan(e.target.value)) })}
                />
                <Button type="button" icon={<ScanLine className="size-4" />} onClick={() => setScanOpen(true)}>
                  Scan
                </Button>
                {code && (
                  <Button type="button" variant="ghost" aria-label="Remove code" onClick={() => setValue("code", "")}>
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </Field>

            {data?.makingChargesRequired && (
              <Field label="Making charges (₹)" required className="mt-4" hint="This offer is calculated on making charges, so enter them from the bill.">
                <Input type="number" inputMode="decimal" step="0.01" min="0" className="tabular" {...register("makingCharges", { valueAsNumber: true })} />
              </Field>
            )}
          </Card>

          <Card title="Customer" icon={UserRound} actions={<span className="text-xs text-muted-foreground">Optional</span>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile number" hint={otpRequired ? "Needed: the offer applies once the customer confirms an OTP." : "Links the sale to the customer and allows one offer per customer."}>
                <CustomerMobileInput field={register("mobile")} value={mobile} onPick={(m) => setValue("mobile", m, { shouldDirty: true })} />
              </Field>
              {mobileValid && lookup.isSuccess && existing && (
                <div className="flex items-end">
                  <div className="flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
                    <UserCheck className="size-4 shrink-0 text-primary" />
                    <span className="truncate font-medium">{existing.name}</span>
                  </div>
                </div>
              )}
              {mobileValid && lookup.isSuccess && !existing && (
                <Field label="Name" required hint={<span className="inline-flex items-center gap-1"><UserPlus className="size-3" /> New customer</span>}>
                  <Input {...register("name")} />
                </Field>
              )}
            </div>

            {otpRequired && mobileValid && (
              <div className="mt-4 space-y-2 rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquareText className="size-4" /> Verify the customer&apos;s mobile
                </div>
                <p className="text-xs text-muted-foreground">We text a one-time code to +91 {mobile}. The offer applies only after the customer reads it out.</p>
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
          </Card>
        </div>

        <div id="sale-summary" className="space-y-6 lg:sticky lg:top-16 lg:col-span-2 lg:self-start">
          <Card title="Partner" icon={HandCoins}>
            {!code ? (
              <Empty icon={ScanLine} title="No partner yet" description="Scan the partner's QR or type their code to see who they are and the offer." />
            ) : !offer ? (
              preview.isFetching && !data ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Checking the code…</p>
              ) : (
                <Alert tone="danger">{data?.codeError?.message ?? (preview.isError ? errorMessage(preview.error) : "Checking the code…")}</Alert>
              )
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-lg font-semibold text-primary">
                    {offer.partner.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-semibold">{offer.partner.name}</span>
                      <Badge tone="gold">{partnerTypeLabel(offer.partner.type)}</Badge>
                    </div>
                    <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                      {offer.partner.contactPerson && <div>Contact: {offer.partner.contactPerson}</div>}
                      {offer.partner.instagramHandle && (
                        <div className="flex items-center gap-1"><AtSign className="size-3" />{offer.partner.instagramHandle.replace(/^@/, "")}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                  <div className="flex items-start gap-2 font-medium">
                    <BadgePercent className="mt-0.5 size-4 shrink-0 text-primary" />
                    {offer.description}
                  </div>
                  <div className="mt-1 pl-6 text-xs text-muted-foreground">
                    {offer.campaign.name}, code <span className="font-mono">{offer.code}</span>
                    {offer.campaign.endsAt && (
                      <div className="mt-0.5 flex items-center gap-1"><CalendarClock className="size-3" /> Runs until {date(offer.campaign.endsAt)}</div>
                    )}
                  </div>
                </div>
                {codeError && <Alert tone="danger">{codeError.message}</Alert>}
              </div>
            )}
          </Card>

          <Card title="Final bill" icon={ReceiptIndianRupee}>
            <dl className="tabular space-y-2 text-sm">
              <Row label="Bill amount" value={inr(billAmount ?? null)} />
              <Row label="Partner discount" value={amounts ? `− ${inr(amounts.discountAmount)}` : "—"} highlight={!!amounts?.discountAmount} />
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-medium">Customer pays</dt>
                <dd className="text-3xl font-semibold tracking-tight" aria-live="polite">
                  {inr(amounts ? amounts.finalAmount : (billAmount ?? null))}
                </dd>
              </div>
              {amounts && offer && (
                <div className="flex justify-end">
                  <Badge tone="gold">
                    {offer.partner.name} earns {points(amounts.pointsAwarded)}
                    {data?.pointValue ? ` (${inr(amounts.pointsAwarded * data.pointValue)})` : ""}
                  </Badge>
                </div>
              )}
            </dl>
            <div className="mt-5 space-y-4">
              <Field label="Notes">
                <Textarea rows={2} {...register("notes")} />
              </Field>
              <Button type="submit" className="w-full" icon={<HandCoins className="size-4" />} loading={record.isPending} disabled={!amounts || !!codeError}>
                Record sale
              </Button>
              <RequiredNote />
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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "flex justify-between font-medium text-primary" : "flex justify-between"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
