"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import {
  DateRangeFilter,
  dateRangeParams,
  EntityFilter,
  FilterBar,
  ListEmpty,
  ListPagination,
  SortableTh,
} from "@/components/list-controls";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  HIDE_BELOW,
  PageHeader,
  SelectInput,
  StatusBadge,
  Table,
  TableSkeleton,
  Td,
  Th,
} from "@/components/ui";
import { useListState } from "@/hooks/use-list-state";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { dateTime, inr, mobile, paymentLabel } from "@/lib/format";
import { useCan } from "@/providers/auth";
import type { Paginated, Transaction } from "@/lib/types";

const FILTERS = ["status", "paymentMode", "withOffer", "campaignId", "influencerId", "from", "to"] as const;

export default function TransactionsPage() {
  const can = useCan();
  const list = useListState({ filters: FILTERS, sort: { by: "createdAt", dir: "DESC" } });
  const f = list.filters;
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["transactions", list.apiParams, f],
    queryFn: () =>
      api.get<Paginated<Transaction>>("/transactions", {
        ...list.apiParams,
        status: f.status,
        paymentMode: f.paymentMode,
        withOffer: f.withOffer,
        campaignId: f.campaignId,
        influencerId: f.influencerId,
        ...dateRangeParams(f.from, f.to),
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Bills"
        description="Every sale made at the store."
        actions={
          can("billing.create") && (
            <Link href="/billing">
              <Button icon={<Plus className="size-4" />}>New bill</Button>
            </Link>
          )
        }
      />
      <Card padded={false}>
        <FilterBar list={list} placeholder="Invoice number, customer name or mobile">
          <DateRangeFilter from={f.from} to={f.to} onChange={(from, to) => list.setFilters({ from, to })} />
          <SelectInput
            className="sm:w-36"
            aria-label="Status"
            value={f.status}
            onValueChange={(v) => list.setFilter("status", v)}
            options={[
              { value: "", label: "All statuses" },
              { value: "COMPLETED", label: "Completed" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
          />
          <SelectInput
            className="sm:w-40"
            aria-label="Payment mode"
            value={f.paymentMode}
            onValueChange={(v) => list.setFilter("paymentMode", v)}
            options={[
              { value: "", label: "Any payment" },
              ...["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER", "MIXED"].map((m) => ({ value: m, label: paymentLabel(m) })),
            ]}
          />
          <SelectInput
            className="sm:w-40"
            aria-label="Partner offer"
            value={f.withOffer}
            onValueChange={(v) => list.setFilters({ withOffer: v, ...(v === "false" ? { campaignId: "", influencerId: "" } : {}) })}
            options={[
              { value: "", label: "With or without offer" },
              { value: "true", label: "With an offer" },
              { value: "false", label: "Without an offer" },
            ]}
          />
          {f.withOffer !== "false" && (
            <>
              <EntityFilter
                path="/campaigns"
                placeholder="Any campaign"
                value={f.campaignId}
                onChange={(v) => list.setFilter("campaignId", v)}
              />
              <EntityFilter
                path="/influencers"
                placeholder="Any partner"
                value={f.influencerId}
                onChange={(v) => list.setFilter("influencerId", v)}
              />
            </>
          )}
        </FilterBar>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} />
          </div>
        ) : !data?.items.length ? (
          <ListEmpty list={list} noun="bills" icon={Receipt} title="No bills yet" description="Bills you create will appear here." />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
            <Table>
              <thead>
                <tr>
                  <SortableTh column="invoiceNumber" sort={list.sort} onSort={list.toggleSort} firstDir="DESC">
                    Invoice
                  </SortableTh>
                  <Th className={HIDE_BELOW.sm}>Customer</Th>
                  <Th className={HIDE_BELOW.lg}>Offer</Th>
                  <SortableTh column="createdAt" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className={HIDE_BELOW.md}>
                    Date
                  </SortableTh>
                  <Th className={HIDE_BELOW.lg}>Paid by</Th>
                  <SortableTh column="grandTotal" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className="text-right">
                    Total
                  </SortableTh>
                  <Th className={HIDE_BELOW.md}>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <Link href={`/transactions/${t.id}`} className="font-mono text-xs font-medium whitespace-nowrap hover:text-primary">
                        {t.invoiceNumber}
                      </Link>
                      <div className="mt-0.5 truncate text-sm font-medium sm:hidden">{t.customer?.name}</div>
                      <div className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground md:hidden">{dateTime(t.createdAt)}</div>
                    </Td>
                    <Td className={HIDE_BELOW.sm}>
                      <div className="font-medium">{t.customer?.name}</div>
                      <div className="text-xs text-muted-foreground">{mobile(t.customer?.mobile)}</div>
                    </Td>
                    <Td className={HIDE_BELOW.lg}>
                      {t.campaignInfluencer ? (
                        <Badge tone="gold">{t.campaignInfluencer.influencer?.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className={cn(HIDE_BELOW.md, "whitespace-nowrap text-muted-foreground")}>{dateTime(t.createdAt)}</Td>
                    <Td className={cn(HIDE_BELOW.lg, "text-muted-foreground")}>{paymentLabel(t.paymentMode)}</Td>
                    <Td className="tabular text-right font-medium whitespace-nowrap">
                      {inr(t.grandTotal)}
                      {t.status !== "COMPLETED" && (
                        <div className="mt-1 md:hidden">
                          <StatusBadge status={t.status} />
                        </div>
                      )}
                    </Td>
                    <Td className={HIDE_BELOW.md}>
                      <StatusBadge status={t.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPagination list={list} total={data.total} noun="bill" />
          </div>
        )}
      </Card>
    </>
  );
}
