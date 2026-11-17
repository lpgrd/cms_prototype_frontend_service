"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Loader2,
  type LucideIcon,
  PackageOpen,
  PauseCircle,
  RotateCcw,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { BackButton } from "../layout/back-button";
import { navItemFor } from "../layout/nav";
import { Skeleton } from "./skeleton";
import { Button as ShadcnButton } from "./button";
import { Checkbox as ShadcnCheckbox } from "./checkbox";
import { Label } from "./label";
import { ComponentProps, ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";

/* ---------- Buttons ---------- */

// Thin wrapper over the shadcn Button: keeps this app's variant names plus `loading` and `icon`.
/**
 * `danger`: soft red, for opening a destructive flow (e.g. "Cancel bill" in a toolbar).
 * `destructive`: solid red, only for the final confirm of an irreversible action.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "destructive";

const variantMap = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive",
  destructive: "default",
} as const;

const SOLID_DESTRUCTIVE = "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30";

interface ButtonProps extends Omit<ComponentProps<typeof ShadcnButton>, "variant" | "size"> {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, icon, disabled, children, ...props }: ButtonProps) {
  return (
    <ShadcnButton
      variant={variantMap[variant]}
      size={size === "sm" ? "sm" : "default"}
      disabled={disabled || loading}
      {...props}
      className={cn(variant === "destructive" && SOLID_DESTRUCTIVE, props.className)}
    >
      {loading ? <Loader2 className="animate-spin" /> : icon}
      {children}
    </ShadcnButton>
  );
}

/* ---------- Form controls ---------- */

export { Input } from "./input";
export { Textarea } from "./textarea";
export { DatePicker, DateTimePicker, FormDatePicker, FormDateTimePicker, FormSelect, SelectInput } from "../form-controls";
export { generatePassword, MaskedInput, PasswordInput, RequiredNote, SecretValue } from "./form-fields";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  required,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  /** Marks the field with a red asterisk (and "required" for screen readers). */
  required?: boolean;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-muted-foreground">
        {label}
        {required && (
          <>
            <span aria-hidden className="ml-0.5 text-destructive">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </span>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/** shadcn Checkbox with a clickable label. */
export function Checkbox({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <ShadcnCheckbox id={id} checked={checked} onCheckedChange={(c) => onCheckedChange(c === true)} disabled={disabled} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

/* ---------- Layout ---------- */

/**
 * The page's "hallmark": a stamped tile holding the section icon, echoing the BIS hallmark on
 * jewellery. It ties every page to its sidebar entry.
 */
export function HallmarkTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl border-2 border-primary/25 bg-primary/5 text-primary ring-1 ring-primary/15 ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/**
 * Standard page header used on every portal page: hallmark tile (the section's icon, found from
 * the URL), title, description and actions. Sub-pages pass `backHref` — the parent list — for Back.
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  className,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  className?: string;
  /** Overrides the section icon taken from the navigation. */
  icon?: LucideIcon;
}) {
  const pathname = usePathname();
  const section = navItemFor(pathname);
  const Icon = icon ?? section?.icon;
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {backHref && <BackButton fallbackHref={backHref} />}
        <div className="flex items-center gap-4">
          {Icon && <HallmarkTile icon={Icon} className="max-sm:hidden" />}
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-tight break-words text-foreground sm:text-3xl">{title}</h1>
            {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
          </div>
        </div>
      </div>
      {actions && <div className="no-print flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  icon: Icon,
  actions,
  children,
  className,
  padded = true,
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card text-card-foreground", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-3.5 sm:px-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className={cn(padded && "p-4 sm:p-5")}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className={cn("rounded-xl border p-4 sm:p-5", accent ? "border-primary/30 bg-primary/5" : "border-border bg-card")}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
        {Icon && <Icon className={cn("mt-0.5 size-4 shrink-0", accent ? "text-primary" : "text-muted-foreground")} aria-hidden />}
      </div>
      <div className="tabular mt-2 text-xl font-semibold tracking-tight break-words text-foreground sm:text-2xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="mt-0.5 truncate text-foreground">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Status ---------- */

// Tones map onto the shadcn theme tokens in globals.css; the theme has no dedicated
// warning/info colours, so those use the neutral secondary/outline treatments.
type Tone = "neutral" | "gold" | "success" | "danger" | "warning" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  gold: "bg-primary/10 text-primary",
  success: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
  warning: "border border-border bg-background text-foreground",
  info: "bg-secondary text-secondary-foreground",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  ACTIVE: "success",
  COMPLETED: "success",
  PAID: "success",
  DRAFT: "neutral",
  INACTIVE: "neutral",
  SCHEDULED: "info",
  APPROVED: "info",
  PAUSED: "warning",
  REQUESTED: "warning",
  EXPIRED: "neutral",
  ENDED: "neutral",
  CANCELLED: "danger",
  REJECTED: "danger",
  REVERSED: "danger",
};

// Status is never conveyed by colour alone: every status carries an icon and its name.
const statusIcons: Record<string, LucideIcon> = {
  ACTIVE: CheckCircle2,
  COMPLETED: CheckCircle2,
  PAID: CheckCircle2,
  APPROVED: ThumbsUp,
  DRAFT: CircleDashed,
  INACTIVE: CircleDashed,
  SCHEDULED: Clock3,
  REQUESTED: Clock3,
  PAUSED: PauseCircle,
  EXPIRED: Clock3,
  ENDED: Ban,
  CANCELLED: XCircle,
  REJECTED: XCircle,
  REVERSED: RotateCcw,
};

export function StatusBadge({ status }: { status: string }) {
  const Icon = statusIcons[status];
  return (
    <Badge tone={statusTones[status] ?? "neutral"}>
      {Icon && <Icon className="mr-1 size-3" aria-hidden />}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

/* ---------- Tables ---------- */

export function Table({ children }: { children: ReactNode }) {
  return (
    // relative: visually hidden labels in cells are absolutely positioned and must stay inside the scroll box.
    <div className="relative overflow-x-auto">
      <table className="w-full text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40">{children}</table>
    </div>
  );
}

/**
 * Classes that hide a table column below a breakpoint, for Th and Td alike. Lower-priority columns drop
 * away on smaller screens so tables fit without sideways scrolling; fold their key detail into a
 * visible cell with a `sm:hidden`-style line where it still matters.
 */
export const HIDE_BELOW = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-border bg-muted/40 px-3 py-2.5 text-xs font-medium text-muted-foreground sm:px-4", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("border-b border-border px-3 py-3 align-middle text-foreground sm:px-4", className)}>
      {children}
    </td>
  );
}

/* ---------- Feedback ---------- */

/** Loading placeholder: skeleton lines shaped like content, announced to screen readers. */
export function Spinner({ label = "Loading…", rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 p-5">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-4 motion-reduce:animate-none" style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

/** Bars at a fixed set of widths, so placeholders look like text without shifting between renders. */
const BAR_WIDTHS = ["72%", "56%", "84%", "64%", "48%", "78%"];
const bar = "motion-reduce:animate-none";

/** Placeholder for a table inside a card: a header row and `rows` rows of `columns` cells. */
export function TableSkeleton({ rows = 6, columns = 5, label = "Loading…" }: { rows?: number; columns?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="relative">
      <span className="sr-only">{label}</span>
      <div className="flex gap-4 border-b border-border bg-muted/40 px-3 py-3 sm:px-4">
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} className={cn("h-3 flex-1", bar, c >= 2 && "max-sm:hidden", c >= 4 && "max-md:hidden")} style={{ maxWidth: c === 0 ? "7rem" : "5rem" }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-3 py-4 last:border-b-0 sm:px-4">
          {Array.from({ length: columns }, (_, c) => (
            <div key={c} className={cn("flex-1 space-y-1.5", c >= 2 && "max-sm:hidden", c >= 4 && "max-md:hidden")}>
              <Skeleton className={cn("h-3.5", bar)} style={{ width: BAR_WIDTHS[(r + c) % BAR_WIDTHS.length] }} />
              {c === 0 && <Skeleton className={cn("h-3", bar)} style={{ width: "40%" }} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Placeholder for a whole page while its data loads: the title block, optional stat tiles, and a card
 * holding a table (lists) or a grid of fields (detail pages).
 */
export function PageSkeleton({ stats = 0, kind = "list", label = "Loading…" }: { stats?: number; kind?: "list" | "detail"; label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="mb-6 flex items-center gap-4 sm:mb-8">
        <Skeleton className={cn("size-12 rounded-xl max-sm:hidden", bar)} />
        <div className="flex-1 space-y-2">
          <Skeleton className={cn("h-7 w-48 sm:h-8", bar)} />
          <Skeleton className={cn("h-4 w-72 max-w-full", bar)} />
        </div>
      </div>
      {stats > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: stats }, (_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
              <Skeleton className={cn("h-3.5 w-24", bar)} />
              <Skeleton className={cn("h-7 w-28", bar)} />
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {kind === "list" ? (
          <TableSkeleton label={label} />
        ) : (
          <div className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className={cn("h-3 w-20", bar)} />
                <Skeleton className={cn("h-4", bar)} style={{ width: BAR_WIDTHS[i % BAR_WIDTHS.length] }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A small spinning indicator with a few words, for work in progress inside a page ("Checking the code…"). */
export function InlineLoading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
      {children}
    </span>
  );
}

export function Empty({
  title,
  description,
  action,
  icon: Icon = PackageOpen,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden>
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="font-heading text-lg font-medium text-foreground">{title}</div>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{error instanceof Error ? error.message : "Something went wrong. Reload the page to try again."}</span>
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "danger" | "success" | "warning"; children: ReactNode }) {
  return <div className={cn("rounded-lg px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  // Portalled to <body> so a dialog opened from inside a page <form> (e.g. billing) is not part of
  // that form — otherwise pressing Enter in the dialog would submit the page's form.
  return createPortal(
    // Phones: an edge-to-edge bottom sheet. Larger screens: a centred dialog. Header and footer stay put while the body scrolls.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[92dvh] w-full flex-col rounded-t-xl border border-border bg-popover text-popover-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-200 sm:max-h-[90dvh] sm:rounded-xl sm:motion-safe:zoom-in-95 sm:motion-safe:slide-in-from-bottom-2",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-heading text-lg font-semibold sm:text-xl">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Confirmation for irreversible actions: says what will happen, and the confirm button
 * is solid red and names the action (never just "OK").
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  disabled,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  /** Extra inputs, e.g. a reason field. */
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Keep it</Button>
          <Button variant="destructive" icon={icon} loading={loading} disabled={disabled} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-4 text-sm text-muted-foreground">
          <div>{description}</div>
          {children}
        </div>
      </div>
    </Modal>
  );
}
