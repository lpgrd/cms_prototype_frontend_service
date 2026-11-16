"use client";

import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ---------- Select ---------- */

export interface Option {
  /** "" represents "no value" (e.g. an "All statuses" filter option). */
  value: string;
  label: string;
}

/** shadcn Select driven by a plain string value; "" maps to Base UI's null (placeholder / "all" option). */
export function SelectInput({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  /** For selects without a visible label, such as list filters. */
  "aria-label"?: string;
}) {
  const items = options.map((o) => ({ value: o.value === "" ? null : o.value, label: o.label }));
  return (
    <Select
      items={items}
      value={value === "" ? null : value}
      onValueChange={(v) => onValueChange((v as string | null) ?? "")}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value ?? "__none"} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ---------- Dates ---------- */

const pad = (n: number) => String(n).padStart(2, "0");
export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Parses "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") would be UTC midnight). */
export const fromYmd = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Date picker (Popover + Calendar). Value is "YYYY-MM-DD" or "" — the format the API expects. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  fromYear = 1940,
  toYear = new Date().getFullYear() + 5,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? fromYmd(value) : undefined;

  return (
    <div className={cn("flex w-full gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              variant="outline"
              className={cn("min-w-0 flex-1 justify-start font-normal", !date && "text-muted-foreground")}
            />
          }
        >
          <CalendarIcon />
          <span className="truncate">{date ? format(date, "d MMM yyyy") : placeholder}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            startMonth={new Date(fromYear, 0)}
            endMonth={new Date(toYear, 11)}
            onSelect={(d) => {
              onChange(d ? toYmd(d) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button variant="ghost" size="icon" aria-label="Clear date" onClick={() => onChange("")}>
          <X />
        </Button>
      )}
    </div>
  );
}

/**
 * Date + time picker. Value is a local "YYYY-MM-DDTHH:mm" string or "".
 * `defaultTime` is used when a date is picked before a time (e.g. "23:59" for an end date).
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder,
  defaultTime = "00:00",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultTime?: string;
  disabled?: boolean;
}) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  return (
    <div className="flex gap-2">
      <DatePicker
        value={datePart}
        onChange={(d) => onChange(d ? `${d}T${timePart || defaultTime}` : "")}
        placeholder={placeholder}
        fromYear={new Date().getFullYear() - 1}
        disabled={disabled}
      />
      <Input
        type="time"
        aria-label="Time"
        className="w-28 shrink-0 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden"
        value={timePart?.slice(0, 5) ?? ""}
        disabled={disabled || !datePart}
        onChange={(e) => datePart && onChange(`${datePart}T${e.target.value || defaultTime}`)}
      />
    </div>
  );
}

/* ---------- react-hook-form bindings ---------- */

interface Bound<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
}

export function FormSelect<T extends FieldValues>({ control, name, ...props }: Bound<T> & Omit<Parameters<typeof SelectInput>[0], "value" | "onValueChange">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <SelectInput {...props} value={field.value ?? ""} onValueChange={field.onChange} />}
    />
  );
}

export function FormDatePicker<T extends FieldValues>({ control, name, ...props }: Bound<T> & Omit<Parameters<typeof DatePicker>[0], "value" | "onChange">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <DatePicker {...props} value={field.value ?? ""} onChange={field.onChange} />}
    />
  );
}

export function FormDateTimePicker<T extends FieldValues>({ control, name, ...props }: Bound<T> & Omit<Parameters<typeof DateTimePicker>[0], "value" | "onChange">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <DateTimePicker {...props} value={field.value ?? ""} onChange={field.onChange} />}
    />
  );
}
