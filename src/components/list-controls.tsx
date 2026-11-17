"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  type LucideIcon,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { PAGE_SIZES, type ListState, type Sort } from "@/hooks/use-list-state";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import type { Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DatePicker, fromYmd, SelectInput, toYmd } from "./form-controls";
import { Button, Empty } from "./ui";

/* ---------- Filter bar ---------- */

/**
 * Search box, filters and a "Clear filters" action above a list.
 * On phones the filters fold behind a "Filters" button so the results stay in view.
 */
export function FilterBar({
  list,
  placeholder,
  children,
}: {
  list: Pick<ListState, "search" | "setSearch" | "query" | "activeFilters" | "clearFilters">;
  placeholder?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const filterCount = list.activeFilters - (list.query ? 1 : 0);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
      {placeholder && (
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search"
            className="pl-9"
            placeholder={placeholder}
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
          />
        </div>
      )}
      {children && (
        <Button
          variant="secondary"
          className="sm:hidden"
          icon={<SlidersHorizontal className="size-4" />}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Filters
          {filterCount > 0 && <span className="tabular rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{filterCount}</span>}
        </Button>
      )}
      <div className={cn("w-full flex-col gap-2 *:w-full sm:contents sm:*:w-auto", open ? "flex" : "hidden")}>{children}</div>
      {list.activeFilters > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(!open && "max-sm:hidden")}
          icon={<X className="size-4" />}
          onClick={list.clearFilters}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state for a list: when filters are on, says nothing matches and offers to clear them;
 * otherwise shows the list's own empty message.
 */
export function ListEmpty({
  list,
  noun,
  icon,
  title,
  description,
  action,
}: {
  list: Pick<ListState, "activeFilters" | "clearFilters">;
  /** Plural, e.g. "bills". */
  noun: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  if (list.activeFilters > 0) {
    return (
      <Empty
        icon={SearchX}
        title={`No ${noun} match these filters`}
        description="Try a different search, or clear the filters to see everything."
        action={
          <Button variant="secondary" onClick={list.clearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }
  return <Empty icon={icon} title={title} description={description} action={action} />;
}

/* ---------- Date range ---------- */

const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toYmd(d);
};

const PRESETS: { value: string; label: string; range: () => [string, string] }[] = [
  { value: "today", label: "Today", range: () => [day(), day()] },
  { value: "yesterday", label: "Yesterday", range: () => [day(-1), day(-1)] },
  { value: "7d", label: "Last 7 days", range: () => [day(-6), day()] },
  { value: "30d", label: "Last 30 days", range: () => [day(-29), day()] },
  {
    value: "month",
    label: "This month",
    range: () => {
      const d = new Date();
      return [toYmd(new Date(d.getFullYear(), d.getMonth(), 1)), day()];
    },
  },
  {
    value: "lastMonth",
    label: "Last month",
    range: () => {
      const d = new Date();
      return [toYmd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), toYmd(new Date(d.getFullYear(), d.getMonth(), 0))];
    },
  },
];

const presetOf = (from: string, to: string) =>
  !from && !to ? "" : (PRESETS.find((p) => p.range().join() === [from, to].join())?.value ?? "custom");

/**
 * Date range as two YYYY-MM-DD strings, picked from presets or a custom from/to.
 * Pair it with `dateRangeParams` to send local-day boundaries to the API.
 */
export function DateRangeFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const matched = presetOf(from, to);
  const [custom, setCustom] = useState(matched === "custom");
  // Clearing the filters elsewhere also leaves custom mode (picking "Custom range" with no dates yet does not).
  const [prevMatched, setPrevMatched] = useState(matched);
  if (matched !== prevMatched) {
    setPrevMatched(matched);
    if (matched === "") setCustom(false);
  }
  const preset = custom ? "custom" : matched;

  return (
    <>
      <SelectInput
        className="sm:w-40"
        aria-label="Date range"
        value={preset}
        onValueChange={(v) => {
          if (v === "custom") return setCustom(true);
          setCustom(false);
          const p = PRESETS.find((x) => x.value === v);
          onChange(...(p ? p.range() : (["", ""] as [string, string])));
        }}
        options={[{ value: "", label: "Any date" }, ...PRESETS, { value: "custom", label: "Custom range" }]}
      />
      {preset === "custom" && (
        <div className="flex items-center gap-1 sm:w-auto">
          <DatePicker
            className="sm:w-40"
            placeholder="From"
            value={from}
            onChange={(v) => onChange(v, to && v > to ? v : to)}
            toYear={new Date().getFullYear()}
          />
          <span className="text-muted-foreground">to</span>
          <DatePicker
            className="sm:w-40"
            placeholder="To"
            value={to}
            onChange={(v) => onChange(from && v && v < from ? v : from, v)}
            toYear={new Date().getFullYear()}
          />
        </div>
      )}
    </>
  );
}

/** Local-day boundaries as ISO timestamps, so "today" means today in the store's time zone. */
export function dateRangeParams(from: string, to: string) {
  const end = to ? fromYmd(to) : undefined;
  end?.setHours(23, 59, 59, 999);
  return { from: from ? fromYmd(from).toISOString() : undefined, to: end?.toISOString() };
}

/* ---------- Pick one record (partner, campaign) ---------- */

interface Entity {
  id: string;
  name: string;
}

/**
 * Searchable picker for filtering by a record, e.g. a partner. Searches the API as you type,
 * so it works however many records there are.
 */
export function EntityFilter({
  path,
  value,
  onChange,
  placeholder,
  className,
}: {
  /** List endpoint, e.g. "/influencers". `${path}/${id}` must return the record. */
  path: string;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  const options = useQuery({
    queryKey: [path, "options", debounced],
    queryFn: () => api.get<Paginated<Entity>>(path, { search: debounced, limit: 20, sortBy: "name", sortDir: "ASC" }),
    staleTime: 60_000,
  });
  const selected = useQuery({
    queryKey: [path, "option", value],
    queryFn: () => api.get<Entity>(`${path}/${value}`),
    enabled: !!value,
    staleTime: 5 * 60_000,
  });
  const current = value ? { id: value, name: selected.data?.name ?? "…" } : null;
  const items = options.data?.items ?? [];

  return (
    <Combobox<Entity>
      items={items}
      filter={null}
      value={current}
      onValueChange={(v) => onChange(v?.id ?? "")}
      onInputValueChange={(v, details) => {
        if (details.reason === "input-change" || v === "") setTerm(v);
      }}
      itemToStringLabel={(e) => e.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <ComboboxInput placeholder={placeholder} aria-label={placeholder} showClear={!!value} className={cn("w-full sm:w-48", className)} />
      <ComboboxContent>
        <ComboboxEmpty>{options.isFetching ? "Searching…" : "No matches"}</ComboboxEmpty>
        <ComboboxList>
          {(e: Entity) => (
            <ComboboxItem key={e.id} value={e}>
              {e.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/* ---------- Sortable header ---------- */

/** Table header that sorts the list by `column`; shows the current direction and sets aria-sort. */
export function SortableTh({
  column,
  sort,
  onSort,
  firstDir = "ASC",
  className,
  children,
}: {
  column: string;
  sort: Sort | undefined;
  onSort: (column: string, firstDir: "ASC" | "DESC") => void;
  /** Direction on first click: DESC suits dates and amounts (newest/largest first). */
  firstDir?: "ASC" | "DESC";
  className?: string;
  children: ReactNode;
}) {
  const active = sort?.by === column;
  const Icon = !active ? ChevronsUpDown : sort.dir === "ASC" ? ArrowUp : ArrowDown;
  const right = className?.includes("text-right");
  return (
    <th
      aria-sort={active ? (sort.dir === "ASC" ? "ascending" : "descending") : "none"}
      className={cn("border-b border-border bg-muted/40 px-3 py-2.5 text-xs font-medium text-muted-foreground sm:px-4", className)}
    >
      <button
        type="button"
        onClick={() => onSort(column, firstDir)}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
          active && "text-foreground",
          right && "flex-row-reverse",
        )}
      >
        {children}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
      </button>
    </th>
  );
}

/* ---------- Pagination ---------- */

/** Page numbers to show: always the first and last, the current page and its neighbours, with gaps as null. */
function pageNumbers(page: number, pages: number): (number | null)[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  // Fill a gap of exactly one page instead of showing "…" for it.
  if (wanted.has(3) && !wanted.has(2) && pages >= 3) wanted.add(2);
  if (wanted.has(pages - 2) && !wanted.has(pages - 1)) wanted.add(pages - 1);
  const sorted = [...wanted].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

/**
 * Footer for a paged list: what's showing, rows per page and page buttons.
 * `noun` names the rows ("bill" → "Showing 1–25 of 213 bills").
 */
export function Pagination({
  page,
  limit,
  total,
  onChange,
  onLimitChange,
  noun = "result",
}: {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  // A filter can shrink the list below the current page; jump to the last page that exists.
  useEffect(() => {
    if (total > 0 && page > pages) onChange(pages);
  }, [page, pages, total, onChange]);

  if (total === 0 || (total <= limit && !onLimitChange) || (total <= PAGE_SIZES[0] && onLimitChange)) {
    return total > 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">{plural(total, noun)}</p> : null;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <span aria-live="polite">
        Showing{" "}
        <span className="tabular text-foreground">
          {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
        </span>{" "}
        of <span className="tabular text-foreground">{plural(total, noun)}</span>
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {onLimitChange && (
          <label className="flex items-center gap-2">
            Rows per page
            <SelectInput
              className="w-20"
              value={String(limit)}
              onValueChange={(v) => onLimitChange(Number(v))}
              options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
            />
          </label>
        )}
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            {pageNumbers(page, pages).map((p, i) =>
              p === null ? (
                <span key={`gap-${i}`} className="px-1" aria-hidden>
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "secondary" : "ghost"}
                  size="sm"
                  className="tabular min-w-8"
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  onClick={() => onChange(p)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}

/** Pagination wired to a list's URL state. */
export function ListPagination({
  list,
  total,
  noun,
}: {
  list: Pick<ListState, "page" | "limit" | "setPage" | "setLimit">;
  total: number;
  noun?: string;
}) {
  return <Pagination page={list.page} limit={list.limit} total={total} onChange={list.setPage} onLimitChange={list.setLimit} noun={noun} />;
}
