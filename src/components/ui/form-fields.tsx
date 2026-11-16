"use client";

import { Eye, EyeOff, Wand2 } from "lucide-react";
import { ComponentProps, FormEvent, ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/* ---------- Input masks ---------- */

/**
 * Shapes what can be typed, so values match the formats the API validates:
 *  mobile  digits only, at most 10
 *  phone   digits, spaces, +, -, () (any number: landline, international)
 *  digits  digits only (use maxLength to cap, e.g. OTP, pincode)
 *  pan     ABCDE1234F: uppercase letters/digits, 10 chars
 *  ifsc    ABCD0123456: uppercase letters/digits, 11 chars
 *  huid    6 uppercase letters/digits
 *  upper   uppercase letters/digits (GSTIN, invoice prefix…)
 */
export type InputMask = "mobile" | "phone" | "digits" | "pan" | "ifsc" | "huid" | "upper";

/** "+91 98765 43210" and "09876543210" both become "9876543210". */
const tenDigitMobile = (v: string) => {
  const d = v.replace(/\D/g, "");
  return ((d.length === 12 && d.startsWith("91")) || (d.length === 11 && d.startsWith("0")) ? d.slice(-10) : d).slice(0, 10);
};

// Lengths are capped in `apply`, not with a maxLength attribute, so pasted text with spaces or a +91 prefix isn't cut short first.
const MASKS: Record<InputMask, { apply: (v: string) => string; inputMode: ComponentProps<"input">["inputMode"] }> = {
  mobile: { apply: tenDigitMobile, inputMode: "numeric" },
  phone: { apply: (v) => v.replace(/[^\d\s+()-]/g, "").slice(0, 20), inputMode: "tel" },
  digits: { apply: (v) => v.replace(/\D/g, ""), inputMode: "numeric" },
  pan: { apply: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10), inputMode: "text" },
  ifsc: { apply: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11), inputMode: "text" },
  huid: { apply: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6), inputMode: "text" },
  upper: { apply: (v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, ""), inputMode: "text" },
};

/**
 * Input that reshapes its value as the user types (works with react-hook-form `register`
 * and with controlled inputs, because the DOM value is fixed before onChange runs).
 */
export function MaskedInput({ mask, maxLength, onChange, onInput, className, ...props }: ComponentProps<"input"> & { mask: InputMask }) {
  const m = MASKS[mask];
  const reshape = (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const shaped = m.apply(el.value);
    const next = maxLength ? shaped.slice(0, maxLength) : shaped;
    if (next !== el.value) el.value = next;
  };
  return (
    <Input
      inputMode={m.inputMode}
      autoCapitalize={mask === "pan" || mask === "ifsc" || mask === "huid" || mask === "upper" ? "characters" : undefined}
      className={cn(mask !== "mobile" && mask !== "phone" && mask !== "digits" && "font-mono", className)}
      onInput={(e) => (reshape(e), onInput?.(e))}
      onChange={(e) => (reshape(e), onChange?.(e))}
      {...props}
    />
  );
}

/* ---------- Passwords ---------- */

/** A strong, readable temporary password (no look-alike characters), e.g. "Kp7m-Qx4w-Rt9v". */
export function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const random = new Uint32Array(12);
  crypto.getRandomValues(random);
  const s = Array.from(random, (n) => chars[n % chars.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

/**
 * Password field with a show/hide toggle. Pass `onGenerate` (e.g. for temporary passwords an
 * admin hands to someone) to add a Generate button that fills and reveals a strong password.
 */
export function PasswordInput({
  className,
  onGenerate,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { onGenerate?: (password: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input {...props} type={visible ? "text" : "password"} className={cn("pr-9", className)} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-9 place-items-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {onGenerate && (
        <button
          type="button"
          onClick={() => {
            onGenerate(generatePassword());
            setVisible(true);
          }}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
        >
          <Wand2 className="size-4" /> Generate
        </button>
      )}
    </div>
  );
}

/* ---------- Display masking ---------- */

const maskMiddle = (value: string, keepStart: number, keepEnd: number) =>
  value.length <= keepStart + keepEnd ? value : `${value.slice(0, keepStart)}${"•".repeat(Math.min(6, value.length - keepStart - keepEnd))}${keepEnd ? value.slice(-keepEnd) : ""}`;

/** How each kind of sensitive value is partly hidden on screen. */
const DISPLAY: Record<"account" | "pan" | "upi", (v: string) => string> = {
  account: (v) => maskMiddle(v, 0, 4),
  pan: (v) => maskMiddle(v, 2, 3),
  upi: (v) => {
    const [user, host] = v.split("@");
    return host ? `${maskMiddle(user, 2, 0)}@${host}` : maskMiddle(v, 2, 0);
  },
};

/** Shows a sensitive value partly hidden, with an eye button to reveal it. */
export function SecretValue({ value, kind, className }: { value: string | null | undefined; kind: keyof typeof DISPLAY; className?: string }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-mono">{revealed ? value : DISPLAY[kind](value)}</span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? "Hide" : "Show"}
        aria-pressed={revealed}
        className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </span>
  );
}

/** Legend for forms that mark required fields. */
export function RequiredNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="text-destructive">*</span> {children ?? "Required"}
    </p>
  );
}
