"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type SortDir = "ASC" | "DESC";
export interface Sort {
  by: string;
  dir: SortDir;
}

export const PAGE_SIZES = [10, 25, 50, 100];

interface Options<F extends string> {
  /** Filter keys this list understands; anything else in the URL is ignored. */
  filters?: readonly F[];
  /** Starting values, e.g. { status: "REQUESTED" } for a work queue. Choosing "" (All) is kept in the URL as "status=". */
  defaults?: Partial<Record<F, string>>;
  /** Default sort, e.g. { by: "createdAt", dir: "DESC" }. */
  sort?: Sort;
  limit?: number;
  /** Debounce for the search box, in ms. */
  delay?: number;
}

/**
 * Page, page size, sort, search and filters for a list screen, kept in the URL so a filtered view
 * survives reloads, Back and shared links. Defaults are left out of the URL to keep it short.
 *
 * URL shape: ?q=asha&status=PAID&sort=-createdAt&page=2&limit=50
 */
export function useListState<F extends string = never>({
  filters: keys = [],
  defaults = {},
  sort: defaultSort,
  limit: defaultLimit = 25,
  delay = 300,
}: Options<F> = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = PAGE_SIZES.includes(Number(params.get("limit"))) ? Number(params.get("limit")) : defaultLimit;
  const query = params.get("q") ?? "";
  const sortParam = params.get("sort");
  const sort: Sort | undefined = sortParam
    ? { by: sortParam.replace(/^-/, ""), dir: sortParam.startsWith("-") ? "DESC" : "ASC" }
    : defaultSort;
  const keysKey = keys.join(",");
  const defaultsKey = JSON.stringify(defaults);
  const filters = useMemo(() => {
    const d = JSON.parse(defaultsKey) as Record<string, string>;
    return Object.fromEntries(
      keysKey
        .split(",")
        .filter(Boolean)
        .map((k) => [k, params.get(k) ?? d[k] ?? ""]),
    ) as Record<F, string>;
  }, [keysKey, defaultsKey, params]);
  const defaultOf = (k: string) => (defaults as Record<string, string | undefined>)[k] ?? "";

  /** Applies changes to the URL. Any change other than the page itself goes back to page 1. */
  const update = useCallback(
    (changes: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) next.delete(k);
        else if (v === "") {
          // An explicit "All" must survive in the URL when the filter's default is something else.
          if ((JSON.parse(defaultsKey) as Record<string, string>)[k]) next.set(k, "");
          else next.delete(k);
        } else next.set(k, String(v));
      }
      if (!("page" in changes)) next.delete("page");
      if (next.get("page") === "1") next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router, defaultsKey],
  );

  // The search box updates instantly; the URL (and so the request) follows after a pause in typing.
  const [search, setSearch] = useState(query);
  // Follow URL changes made elsewhere (Back, Clear filters), but not the echo of what's being typed.
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    if (query !== search.trim()) setSearch(query);
  }
  useEffect(() => {
    if (search.trim() === query) return;
    const t = setTimeout(() => update({ q: search.trim() }), delay);
    return () => clearTimeout(t);
  }, [search, query, delay, update]);

  const isDefaultSort = (s: Sort) => !!defaultSort && s.by === defaultSort.by && s.dir === defaultSort.dir;
  const activeFilters = keys.filter((k) => filters[k] !== defaultOf(k)).length + (query ? 1 : 0);
  /** Setting a filter back to its default removes it from the URL. */
  const filterChanges = (values: Partial<Record<F, string>>) =>
    Object.fromEntries(Object.entries<string | undefined>(values).map(([k, v]) => [k, v === defaultOf(k) ? null : (v ?? null)]));

  return {
    page,
    limit,
    sort,
    search,
    query,
    filters,
    activeFilters,
    setSearch,
    setPage: (p: number) => update({ page: p }),
    setLimit: (l: number) => update({ limit: l === defaultLimit ? null : l }),
    setFilter: (key: F, value: string) => update(filterChanges({ [key]: value } as Partial<Record<F, string>>)),
    setFilters: (values: Partial<Record<F, string>>) => update(filterChanges(values)),
    /** Clicking the sorted column flips direction; a new column starts with `firstDir`. */
    toggleSort: (by: string, firstDir: SortDir = "ASC") => {
      const s: Sort = sort?.by === by ? { by, dir: sort.dir === "ASC" ? "DESC" : "ASC" } : { by, dir: firstDir };
      update({ sort: isDefaultSort(s) ? null : `${s.dir === "DESC" ? "-" : ""}${s.by}` });
    },
    clearFilters: () => {
      setSearch("");
      update({ q: null, ...Object.fromEntries(keys.map((k) => [k, null])) });
    },
    /** Paging and sort params in the shape every list endpoint accepts. */
    apiParams: { page, limit, search: query, sortBy: sort?.by, sortDir: sort?.dir },
  };
}

export type ListState = ReturnType<typeof useListState>;
