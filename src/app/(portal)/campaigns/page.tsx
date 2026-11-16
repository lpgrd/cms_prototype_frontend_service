"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Megaphone, Plus } from "lucide-react";
import Link from "next/link";
import { FilterBar, ListEmpty, ListPagination, SortableTh } from "@/components/list-controls";
import { Button, Card, ErrorState, HIDE_BELOW, PageHeader, SelectInput, Spinner, StatusBadge, Table, Td, Th } from "@/components/ui";
import { useListState } from "@/hooks/use-list-state";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import type { Campaign, Paginated } from "@/lib/types";
import { useCan } from "@/providers/auth";
import { describeOffer, describeReward } from "./describe";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Running now" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PAUSED", label: "Paused" },
  { value: "EXPIRED", label: "Expired" },
  { value: "DRAFT", label: "Draft" },
  { value: "ENDED", label: "Ended" },
];

export default function CampaignsPage() {
  const can = useCan();
  const list = useListState({ filters: ["status"] as const, sort: { by: "createdAt", dir: "DESC" } });
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["campaigns", list.apiParams, list.filters],
    queryFn: () => api.get<Paginated<Campaign>>("/campaigns", { ...list.apiParams, ...list.filters }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Partner offers: each campaign gives every partner in it a unique QR code."
        actions={
          can("campaigns.manage") && (
            <Link href="/campaigns/new">
              <Button icon={<Plus className="size-4" />}>New campaign</Button>
            </Link>
          )
        }
      />
      <Card padded={false}>
        <FilterBar list={list} placeholder="Campaign name">
          <SelectInput className="sm:w-40" aria-label="Status" value={list.filters.status} onValueChange={(v) => list.setFilter("status", v)} options={STATUSES} />
        </FilterBar>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : !data?.items.length ? (
          <ListEmpty
            list={list}
            noun="campaigns"
            icon={Megaphone}
            title="No campaigns yet"
            description="Create a campaign, add partners and share their QR codes."
            action={can("campaigns.manage") && <Link href="/campaigns/new"><Button>New campaign</Button></Link>}
          />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
            <Table>
              <thead>
                <tr>
                  <SortableTh column="name" sort={list.sort} onSort={list.toggleSort}>Campaign</SortableTh>
                  <Th className={HIDE_BELOW.lg}>Offer</Th>
                  <SortableTh column="startsAt" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className={HIDE_BELOW.md}>Runs</SortableTh>
                  <Th className={cn(HIDE_BELOW.xl, "text-right")}>Partners</Th>
                  <Th className="text-right">Redemptions</Th>
                  <Th className={HIDE_BELOW.sm}>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <Link href={`/campaigns/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                      <div className="mt-0.5 text-xs text-muted-foreground lg:hidden">{describeOffer(c)}</div>
                      <div className="mt-1 sm:hidden">
                        <StatusBadge status={c.effectiveStatus ?? c.status} />
                      </div>
                    </Td>
                    <Td className={HIDE_BELOW.lg}>
                      <div>{describeOffer(c)}</div>
                      <div className="text-xs text-muted-foreground">{describeReward(c)}</div>
                    </Td>
                    <Td className={cn(HIDE_BELOW.md, "text-muted-foreground")}>
                      {c.startsAt || c.endsAt ? `${c.startsAt ? date(c.startsAt) : "Now"} – ${c.endsAt ? date(c.endsAt) : "open"}` : "No time limit"}
                    </Td>
                    <Td className={cn(HIDE_BELOW.xl, "tabular text-right")}>{c.influencerCount}</Td>
                    <Td className="tabular text-right">{c.redemptionCount}</Td>
                    <Td className={HIDE_BELOW.sm}><StatusBadge status={c.effectiveStatus ?? c.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPagination list={list} total={data.total} noun="campaign" />
          </div>
        )}
      </Card>
    </>
  );
}
