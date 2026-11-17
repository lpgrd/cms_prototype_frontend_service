"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import Link from "next/link";
import { EntityFilter, FilterBar, ListEmpty, ListPagination, SortableTh } from "@/components/list-controls";
import { Badge, Card, ErrorState, HIDE_BELOW, PageHeader, SelectInput, Table, TableSkeleton, Td, Th } from "@/components/ui";
import { useListState } from "@/hooks/use-list-state";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { date, mobile, sourceLabel } from "@/lib/format";
import type { Customer, Paginated } from "@/lib/types";
import { useCan } from "@/providers/auth";
import { CustomerFormButton } from "./customer-form";

const FILTERS = ["source", "acquiredViaInfluencerId", "occasionWithinDays", "marketingConsent", "minSpend"] as const;

// The list shows customer details only; spend and purchase history live on each customer's page.
export default function CustomersPage() {
  const can = useCan();
  const list = useListState({ filters: FILTERS, sort: { by: "createdAt", dir: "DESC" } });
  const f = list.filters;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["customers", list.apiParams, f],
    queryFn: () => api.get<Paginated<Customer>>("/customers", { ...list.apiParams, ...f }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Customer details. Open a customer to see their bills, spend and offers used."
        actions={can("customers.edit") && <CustomerFormButton />}
      />
      <Card padded={false}>
        <FilterBar list={list} placeholder="Name, mobile or email">
          <SelectInput
            className="sm:w-36"
            aria-label="Source"
            value={f.source}
            onValueChange={(v) => list.setFilters({ source: v, ...(v && v !== "INFLUENCER" ? { acquiredViaInfluencerId: "" } : {}) })}
            options={[
              { value: "", label: "All sources" },
              ...["WALK_IN", "INFLUENCER", "REFERRAL", "ONLINE", "OTHER"].map((s) => ({ value: s, label: sourceLabel(s) })),
            ]}
          />
          {(!f.source || f.source === "INFLUENCER") && (
            <EntityFilter
              path="/influencers"
              placeholder="Brought by anyone"
              value={f.acquiredViaInfluencerId}
              onChange={(v) => list.setFilter("acquiredViaInfluencerId", v)}
            />
          )}
          <SelectInput
            className="sm:w-52"
            aria-label="Occasion"
            value={f.occasionWithinDays}
            onValueChange={(v) => list.setFilter("occasionWithinDays", v)}
            options={[
              { value: "", label: "Any occasion" },
              { value: "7", label: "Birthday/anniversary in 7 days" },
              { value: "30", label: "Birthday/anniversary in 30 days" },
            ]}
          />
          <SelectInput
            className="sm:w-36"
            aria-label="Lifetime spend"
            value={f.minSpend}
            onValueChange={(v) => list.setFilter("minSpend", v)}
            options={[
              { value: "", label: "Any spend" },
              { value: "50000", label: "Spent ₹50,000+" },
              { value: "100000", label: "Spent ₹1 lakh+" },
              { value: "500000", label: "Spent ₹5 lakh+" },
            ]}
          />
          <SelectInput
            className="sm:w-40"
            aria-label="Marketing consent"
            value={f.marketingConsent}
            onValueChange={(v) => list.setFilter("marketingConsent", v)}
            options={[
              { value: "", label: "Any consent" },
              { value: "true", label: "Opted in to offers" },
              { value: "false", label: "Not opted in" },
            ]}
          />
        </FilterBar>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : !data?.items.length ? (
          <ListEmpty list={list} noun="customers" icon={Users} title="No customers yet" description="Customers are added automatically when they're billed, or you can add one." />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
            <Table>
              <thead>
                <tr>
                  <SortableTh column="name" sort={list.sort} onSort={list.toggleSort}>Customer</SortableTh>
                  <Th className={HIDE_BELOW.lg}>Email</Th>
                  <Th className={HIDE_BELOW.md}>City</Th>
                  <Th className={HIDE_BELOW.sm}>Source</Th>
                  <Th className={HIDE_BELOW.lg}>Tags</Th>
                  <SortableTh column="createdAt" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className={HIDE_BELOW.md}>Added</SortableTh>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <Link href={`/customers/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                      <div className="text-xs text-muted-foreground">{mobile(c.mobile)}</div>
                    </Td>
                    <Td className={cn(HIDE_BELOW.lg, "max-w-56 truncate text-muted-foreground")}>{c.email ?? "—"}</Td>
                    <Td className={cn(HIDE_BELOW.md, "text-muted-foreground")}>{c.city ?? "—"}</Td>
                    <Td className={HIDE_BELOW.sm}>
                      {c.acquiredViaInfluencer ? (
                        <Badge tone="gold">via {c.acquiredViaInfluencer.name}</Badge>
                      ) : (
                        <Badge>{sourceLabel(c.source)}</Badge>
                      )}
                    </Td>
                    <Td className={HIDE_BELOW.lg}>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.length ? c.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>) : <span className="text-muted-foreground">—</span>}
                      </div>
                    </Td>
                    <Td className={cn(HIDE_BELOW.md, "whitespace-nowrap text-muted-foreground")}>{date(c.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPagination list={list} total={data.total} noun="customer" />
          </div>
        )}
      </Card>
    </>
  );
}
