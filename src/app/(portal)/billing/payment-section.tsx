"use client";

import { CircleCheck, Plus, Split, Trash2, X } from "lucide-react";
import { Control, useFieldArray, UseFormRegister, UseFormSetValue, useWatch } from "react-hook-form";
import { Button, Field, FormSelect, Input } from "@/components/ui";
import { inr } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; reference?: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI", reference: "UPI ref / UTR" },
  { value: "CARD", label: "Card", reference: "Card slip no." },
  { value: "BANK_TRANSFER", label: "Bank transfer", reference: "UTR" },
  { value: "CHEQUE", label: "Cheque", reference: "Cheque no." },
  { value: "OTHER", label: "Other", reference: "e.g. old gold exchange" },
];
const referenceHint = (m: PaymentMethod | undefined) => PAYMENT_METHODS.find((p) => p.value === m)?.reference;

export interface PaymentLineForm {
  method: PaymentMethod;
  amount?: number;
  reference: string;
}

/** The parts of the bill form this section owns. */
export interface PaymentFormValues {
  /** Paid one way, or split across several lines. */
  split: boolean;
  paymentMode: PaymentMethod;
  paymentReference: string;
  payments: PaymentLineForm[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const paidSoFar = (lines: PaymentLineForm[] | undefined) =>
  round2((lines ?? []).reduce((sum, l) => sum + (Number.isFinite(l.amount) && (l.amount ?? 0) > 0 ? l.amount! : 0), 0));

/**
 * How the customer pays: one method for the whole bill, or a split such as part cash, part UPI.
 * The split must add up to the bill before it can be saved; the server checks this too.
 */
export function PaymentSection<T extends PaymentFormValues>({
  control,
  register,
  setValue,
  total,
}: {
  control: Control<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  /** Bill total, once items make a valid bill. */
  total: number | undefined;
}) {
  // react-hook-form's generic paths don't narrow through T, so the section works on its own shape.
  const c = control as unknown as Control<PaymentFormValues>;
  const reg = register as unknown as UseFormRegister<PaymentFormValues>;
  const set = setValue as unknown as UseFormSetValue<PaymentFormValues>;
  const { fields, append, remove, replace } = useFieldArray({ control: c, name: "payments" });
  const [split, mode, lines] = useWatch({ control: c, name: ["split", "paymentMode", "payments"] });

  const paid = paidSoFar(lines);
  const remaining = total === undefined ? undefined : round2(total - paid);

  const startSplit = () => {
    // Start from what was picked: that method for part of the bill, and one more line for the rest.
    const other: PaymentMethod = mode === "CASH" ? "UPI" : "CASH";
    replace([
      { method: mode, amount: undefined, reference: "" },
      { method: other, amount: undefined, reference: "" },
    ]);
    set("split", true);
  };
  const stopSplit = () => {
    set("paymentMode", lines?.[0]?.method ?? mode);
    replace([]);
    set("split", false);
  };
  /** Puts what is left on the first line without an amount, or on a new line. */
  const addRest = () => {
    if (!remaining || remaining <= 0) return;
    const empty = (lines ?? []).findIndex((l) => !(Number.isFinite(l.amount) && (l.amount ?? 0) > 0));
    if (empty >= 0) set(`payments.${empty}.amount`, remaining, { shouldDirty: true });
    else append({ method: unusedMethod(lines), amount: remaining, reference: "" });
  };

  if (!split) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Field label="Payment mode" required>
            <FormSelect control={c} name="paymentMode" options={PAYMENT_METHODS} />
          </Field>
          {mode !== "CASH" && (
            <Field label="Reference (optional)">
              <Input placeholder={referenceHint(mode)} maxLength={80} {...reg("paymentReference")} />
            </Field>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" icon={<Split className="size-4" />} onClick={startSplit}>
          Split between methods
        </Button>
      </div>
    );
  }

  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <legend className="text-sm font-medium">
          Payments{" "}
          <span aria-hidden className="text-destructive">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </legend>
        <Button type="button" variant="ghost" size="sm" icon={<X className="size-4" />} onClick={stopSplit}>
          Pay one way
        </Button>
      </div>

      <ul className="space-y-2">
        {fields.map((f, i) => (
          <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <FormSelect control={c} name={`payments.${i}.method`} options={PAYMENT_METHODS} aria-label={`Payment ${i + 1} method`} />
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="₹ amount"
              aria-label={`Payment ${i + 1} amount`}
              className="tabular"
              {...reg(`payments.${i}.amount`, { valueAsNumber: true })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove payment ${i + 1}`}
              disabled={fields.length <= 2}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2 className="size-4" />
            </Button>
            {lines?.[i]?.method !== "CASH" && (
              <Input
                className="col-span-2"
                placeholder={`${referenceHint(lines?.[i]?.method)} (optional)`}
                aria-label={`Payment ${i + 1} reference`}
                maxLength={80}
                {...reg(`payments.${i}.reference`)}
              />
            )}
          </li>
        ))}
      </ul>

      <SplitStatus total={total} paid={paid} remaining={remaining} />

      <div className="flex flex-wrap gap-2">
        {!!remaining && remaining > 0 && (
          <Button type="button" variant="secondary" size="sm" onClick={addRest}>
            Add the rest ({inr(remaining)})
          </Button>
        )}
        {fields.length < 6 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => append({ method: unusedMethod(lines), amount: undefined, reference: "" })}
          >
            Add payment
          </Button>
        )}
      </div>
    </fieldset>
  );
}

function SplitStatus({ total, paid, remaining }: { total?: number; paid: number; remaining?: number }) {
  if (total === undefined || remaining === undefined) {
    return <p className="text-xs text-muted-foreground">Add the items first; the split is checked against the bill total.</p>;
  }
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const settled = remaining === 0;
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={cn(
            "h-full rounded-full transition-[width] motion-reduce:transition-none",
            remaining < 0 ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="tabular flex flex-wrap items-center justify-between gap-x-3 text-xs">
        <span className="text-muted-foreground">
          {inr(paid)} of {inr(total)}
        </span>
        {settled ? (
          <span className="flex items-center gap-1 font-medium text-primary">
            <CircleCheck className="size-3.5" aria-hidden /> Fully paid
          </span>
        ) : remaining > 0 ? (
          <span className="font-medium text-foreground">{inr(remaining)} left to collect</span>
        ) : (
          <span className="font-medium text-destructive">{inr(-remaining)} more than the bill</span>
        )}
      </div>
    </div>
  );
}

/** A sensible method for a new line: the first one not used yet. */
const unusedMethod = (lines: PaymentLineForm[] | undefined): PaymentMethod =>
  PAYMENT_METHODS.find((m) => !(lines ?? []).some((l) => l.method === m.value))?.value ?? "OTHER";
