"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { History, Loader2, UserRound } from "lucide-react";
import { KeyboardEvent, useEffect, useId, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { MaskedInput } from "@/components/ui";
import { api } from "@/lib/api";
import { date, phone, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  name: string;
  mobile: string;
  city: string | null;
  purchaseCount: number;
  lastPurchaseAt: string | null;
  /** Set when the typed digits matched another of the customer's numbers, not their primary mobile. */
  matched: { value: string; label: string | null; isOutdated: boolean } | null;
}

const MIN_DIGITS = 3;

/**
 * Mobile number field that suggests existing customers as the number is typed, matching any part of
 * their primary mobile or of their other (including outdated) numbers. Picking one fills in their
 * primary mobile, which loads their details into the bill.
 */
export function CustomerMobileInput({
  field,
  value,
  onPick,
  autoFocus,
}: {
  /** react-hook-form's register("mobile"). */
  field: UseFormRegisterReturn;
  /** Current digits in the field. */
  value: string;
  onPick: (mobile: string) => void;
  autoFocus?: boolean;
}) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);

  const [term, setTerm] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setTerm(value), 150);
    return () => clearTimeout(t);
  }, [value]);

  const { data, isFetching } = useQuery({
    queryKey: ["customer-suggest", term],
    queryFn: () => api.get<{ items: Suggestion[] }>("/customers/suggest", { q: term }),
    enabled: term.length >= MIN_DIGITS,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const items = value.length >= MIN_DIGITS ? (data?.items ?? []) : [];
  // Includes the pause before the search is sent, so the field shows it is working as soon as typing stops.
  const searching = focused && value.length >= MIN_DIGITS && (isFetching || term !== value);
  // Once the field holds exactly one customer's primary mobile, the details card takes over.
  const settled = items.length > 0 && items.every((c) => c.mobile === value);
  const open = focused && !dismissed && items.length > 0 && !settled;

  // A new search starts with nothing highlighted.
  const [activeFor, setActiveFor] = useState(term);
  if (activeFor !== term) {
    setActiveFor(term);
    setActive(-1);
  }

  const pick = (c: Suggestion) => {
    onPick(c.mobile);
    setDismissed(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" && items.length) setDismissed(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const last = items.length - 1;
      setActive((i) => (e.key === "ArrowDown" ? (i >= last ? 0 : i + 1) : i <= 0 ? last : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // pick the customer instead of submitting the bill
      pick(items[active]);
    } else if (e.key === "Escape") {
      setDismissed(true);
    }
  };

  return (
    <div className="relative">
      <MaskedInput
        {...field}
        mask="mobile"
        placeholder="9876543210"
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          return field.onBlur(e);
        }}
        onChange={(e) => {
          setDismissed(false);
          return field.onChange(e);
        }}
        onKeyDown={onKeyDown}
        className={searching ? "pr-9" : undefined}
      />
      {searching && (
        <Loader2
          role="status"
          aria-label="Searching customers"
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground motion-reduce:animate-none"
        />
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching customers"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 sm:min-w-96"
        >
          {items.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: picking must happen before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-start gap-3 rounded-md px-2.5 py-2 text-sm", i === active && "bg-accent text-accent-foreground")}
            >
              <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="tabular shrink-0">
                    <Digits text={`${c.mobile.slice(0, 5)} ${c.mobile.slice(5)}`} query={c.matched ? "" : value} />
                  </span>
                </div>
                {c.matched && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <History className="size-3" aria-hidden />
                    {c.matched.isOutdated ? "Old number" : (c.matched.label ?? "Other number")}{" "}
                    <span className="tabular">
                      <Digits text={phone(c.matched.value)} query={value} />
                    </span>
                  </div>
                )}
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {[c.city, c.purchaseCount ? `${plural(c.purchaseCount, "purchase")}, last on ${date(c.lastPurchaseAt)}` : "No purchases yet"]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A formatted number with the typed digits highlighted, even across the spaces formatting adds. */
function Digits({ text, query }: { text: string; query: string }) {
  const digitsOnly = text.replace(/\D/g, "");
  const start = query ? digitsOnly.indexOf(query) : -1;
  if (start < 0) return <>{text}</>;
  let n = -1;
  return (
    <>
      {[...text].map((ch, i) => {
        if (/\d/.test(ch)) n++;
        const hit = /\d/.test(ch) && n >= start && n < start + query.length;
        return hit ? (
          <mark key={i} className="bg-transparent font-semibold text-primary">
            {ch}
          </mark>
        ) : (
          <span key={i}>{ch}</span>
        );
      })}
    </>
  );
}
