"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import Link from "next/link";
import { EntityFilter, FilterBar, ListEmpty, ListPagination, SortableTh } from "@/components/list-controls";
import { Badge, Card, ErrorState, HIDE_BELOW, PageHeader, SelectInput, Spinner, StatusBadge, Table, Td, Th } from "@/components/ui";
import { useListState } from "@/hooks/use-list-state";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { PARTNER_TYPES, mobile, number, partnerTypeLabel } from "@/lib/format";
import type { Influencer, Paginated } from "@/lib/types";
import { useCan } from "@/providers/auth";
import { PartnerFormButton } from "./partner-form";

const FILTERS = ["type", "status", "campaignId", "hasBalance"] as const;

export default function PartnersPage() {
  const can = useCan();
  const list = useListState({ filters: FILTERS, sort: { by: "createdAt", dir: "DESC" } });
  const f = list.filters;
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["influencers", list.apiParams, f],
    queryFn: () => api.get<Paginated<Influencer>>("/influencers", { ...list.apiParams, ...f }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Partners" description="Influencers, businesses and others who bring customers in with their own offer code, and the points they've earned." actions={can("influencers.manage") && <PartnerFormButton />} />
      <Card padded={false}>
        <FilterBar list={list} placeholder="Name, contact person, mobile or Instagram">
          <SelectInput
            className="sm:w-36"
            aria-label="Type"
            value={f.type}
            onValueChange={(v) => list.setFilter("type", v)}
            options={[{ value: "", label: "All types" }, ...PARTNER_TYPES]}
          />
          <SelectInput
            className="sm:w-36"
            aria-label="Status"
            value={f.status}
            onValueChange={(v) => list.setFilter("status", v)}
            options={[
              { value: "", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
          <EntityFilter path="/campaigns" placeholder="In any campaign" value={f.campaignId} onChange={(v) => list.setFilter("campaignId", v)} />
          <SelectInput
            className="sm:w-44"
            aria-label="Points"
            value={f.hasBalance}
            onValueChange={(v) => list.setFilter("hasBalance", v)}
            options={[
              { value: "", label: "Any points balance" },
              { value: "true", label: "Has points to pay out" },
            ]}
          />
        </FilterBar>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : !data?.items.length ? (
          <ListEmpty list={list} noun="partners" icon={Handshake} title="No partners yet" description="Add a partner, then add them to a campaign to create their QR code." />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
            <Table>
              <thead>
                <tr>
                  <SortableTh column="name" sort={list.sort} onSort={list.toggleSort}>Partner</SortableTh>
                  <Th className={HIDE_BELOW.md}>Type</Th>
                  <Th className={HIDE_BELOW.lg}>Instagram</Th>
                  <Th className={cn(HIDE_BELOW.lg, "text-right")}>Campaigns</Th>
                  <Th className={cn(HIDE_BELOW.sm, "text-right")}>Customers brought</Th>
                  <SortableTh column="pointsBalance" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className="text-right">Points balance</SortableTh>
                  <Th className={HIDE_BELOW.md}>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id}>
                    <Td>
                      <Link href={`/partners/${i.id}`} className="font-medium hover:text-primary">{i.name}</Link>
                      <div className="text-xs text-muted-foreground">
                        {i.contactPerson ? `${i.contactPerson}, ` : ""}
                        {mobile(i.mobile)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                        <Badge>{partnerTypeLabel(i.type)}</Badge>
                        {i.status !== "ACTIVE" && <StatusBadge status={i.status} />}
                      </div>
                    </Td>
                    <Td className={HIDE_BELOW.md}><Badge>{partnerTypeLabel(i.type)}</Badge></Td>
                    <Td className={cn(HIDE_BELOW.lg, "text-muted-foreground")}>{i.instagramHandle ? `@${i.instagramHandle}` : "—"}</Td>
                    <Td className={cn(HIDE_BELOW.lg, "tabular text-right")}>{i.campaignCount}</Td>
                    <Td className={cn(HIDE_BELOW.sm, "tabular text-right")}>{i.redemptionCount}</Td>
                    <Td className="tabular text-right font-medium">{number(i.pointsBalance)}</Td>
                    <Td className={HIDE_BELOW.md}><StatusBadge status={i.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPagination list={list} total={data.total} noun="partner" />
          </div>
        )}
      </Card>
    </>
  );
}
