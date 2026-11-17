"use client";

import { ScrollText } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DateRangeFilter, dateRangeParams, FilterBar, ListEmpty, ListPagination } from "@/components/list-controls";
import { Badge, Card, ErrorState, HIDE_BELOW, PageHeader, SelectInput, Table, TableSkeleton, Td, Th } from "@/components/ui";
import { useListState } from "@/hooks/use-list-state";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { AuditEntry, Paginated } from "@/lib/types";

const AREAS = [
  { value: "", label: "All activity" },
  { value: "auth", label: "Sign-ins & security" },
  { value: "transaction", label: "Bills" },
  { value: "payout", label: "Payouts" },
  { value: "points", label: "Points adjustments" },
  { value: "campaign", label: "Campaigns" },
  { value: "influencer", label: "Partners" },
  { value: "customer", label: "Customers & consent" },
  { value: "settings", label: "Settings" },
  { value: "user", label: "Users" },
  { value: "report", label: "Report exports" },
];

const tone = (action: string) =>
  /failed|cancel|reject|disabled|withdrawn/.test(action) ? "danger" : action.startsWith("auth.") ? "info" : "neutral";

export default function AuditPage() {
  // Always newest first: the log reads as a timeline.
  const list = useListState({ filters: ["area", "from", "to"] as const, limit: 50 });
  const f = list.filters;
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["audit", list.apiParams, f],
    queryFn: () =>
      api.get<Paginated<AuditEntry>>("/audit", {
        page: list.page,
        limit: list.limit,
        search: list.query,
        action: f.area ? `${f.area}.` : "",
        ...dateRangeParams(f.from, f.to),
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Audit log" description="Who did what and when: sign-ins, bill cancellations, payouts, settings and more." />
      <Card padded={false}>
        <FilterBar list={list} placeholder="Invoice number, name or detail">
          <SelectInput
            className="sm:w-52"
            aria-label="Activity"
            value={f.area}
            onValueChange={(v) => list.setFilter("area", v)}
            options={AREAS}
          />
          <DateRangeFilter from={f.from} to={f.to} onChange={(from, to) => list.setFilters({ from, to })} />
        </FilterBar>
        {isLoading ? (
          <TableSkeleton />
        ) : error || !data ? (
          <div className="p-4">
            <ErrorState error={error} />
          </div>
        ) : !data.items.length ? (
          <ListEmpty list={list} noun="entries" icon={ScrollText} title="No activity recorded" />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
            <Table>
              <thead>
                <tr>
                  <Th className={HIDE_BELOW.md}>When</Th>
                  <Th className={HIDE_BELOW.md}>Who</Th>
                  <Th className={HIDE_BELOW.sm}>Action</Th>
                  <Th>Details</Th>
                  <Th className={HIDE_BELOW.lg}>IP</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id}>
                    <Td className={cn(HIDE_BELOW.md, "whitespace-nowrap text-muted-foreground")}>{dateTime(e.createdAt)}</Td>
                    <Td className={HIDE_BELOW.md}>
                      {e.actor ? (
                        <>
                          <div className="font-medium">{e.actor.name}</div>
                          <div className="text-xs text-muted-foreground">{e.actor.email}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">System / anonymous</span>
                      )}
                    </Td>
                    <Td className={HIDE_BELOW.sm}>
                      <Badge tone={tone(e.action)}>{e.action}</Badge>
                    </Td>
                    <Td className="max-w-md">
                      {e.summary}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground md:hidden">
                        <span className="sm:hidden">
                          <Badge tone={tone(e.action)}>{e.action}</Badge>
                        </span>
                        <span>{dateTime(e.createdAt)}</span>
                        <span>{e.actor ? e.actor.name : "System"}</span>
                      </div>
                    </Td>
                    <Td className={cn(HIDE_BELOW.lg, "font-mono text-xs text-muted-foreground")}>{e.ip ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPagination list={list} total={data.total} noun="entry" />
          </div>
        )}
      </Card>
    </>
  );
}
