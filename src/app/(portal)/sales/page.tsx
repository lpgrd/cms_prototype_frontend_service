"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, HandCoins, IndianRupee, Plus, ReceiptIndianRupee, Sparkles, TicketPercent } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DateRangeFilter, dateRangeParams, EntityFilter, FilterBar, ListEmpty, ListPagination, SortableTh } from "@/components/list-controls";
import { Alert, Button, Card, ConfirmDialog, ErrorState, Field, HIDE_BELOW, PageHeader, SelectInput, Spinner, Stat, StatusBadge, Table, Td, Textarea, Th } from "@/components/ui";
import { useListState } from "@/hooks/use-list-state";
import { api, errorMessage } from "@/lib/api";
import { dateTime, inr, inrShort, mobile, number, points } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Paginated, PartnerSale, SaleTotals } from "@/lib/types";
import { useCan } from "@/providers/auth";

const FILTERS = ["status", "campaignId", "influencerId", "from", "to"] as const;
/** The customer column only fits beside the amounts on wide screens. */
const CUSTOMER_COL = "hidden 2xl:table-cell";

export default function SalesPage() {
  const can = useCan();
  const list = useListState({ filters: FILTERS, sort: { by: "createdAt", dir: "DESC" } });
  const f = list.filters;
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["partner-sales", list.apiParams, f],
    queryFn: () =>
      api.get<Paginated<PartnerSale> & { totals: SaleTotals }>("/partner-sales", {
        ...list.apiParams,
        status: f.status,
        campaignId: f.campaignId,
        influencerId: f.influencerId,
        ...dateRangeParams(f.from, f.to),
      }),
    placeholderData: keepPreviousData,
  });
  const [cancelling, setCancelling] = useState<PartnerSale | null>(null);
  const totals = data?.totals;

  return (
    <>
      <PageHeader
        title="Sales"
        description="Partner sales recorded at the counter: what was billed, the discount given and what partners earned."
        actions={
          can("billing.create") && (
            <Link href="/sales/new">
              <Button icon={<Plus className="size-4" />}>Partner sale</Button>
            </Link>
          )
        }
      />

      {/* Totals follow the filters, so a date range or partner gives that period's or partner's figures. */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={ReceiptIndianRupee} label="Billed" value={inrShort(totals?.billAmount)} sub={totals ? `${number(totals.sales)} sales` : undefined} />
        <Stat icon={TicketPercent} label="Discount given" value={inrShort(totals?.discountAmount)} />
        <Stat icon={IndianRupee} label="Customers paid" value={inrShort(totals?.finalAmount)} accent />
        <Stat icon={Sparkles} label="Partner points" value={points(totals?.pointsAwarded)} />
      </div>

      <Card padded={false}>
        <FilterBar list={list} placeholder="Sale #, bill number, code, partner or customer">
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
          <EntityFilter path="/campaigns" placeholder="Any campaign" value={f.campaignId} onChange={(v) => list.setFilter("campaignId", v)} />
          <EntityFilter path="/influencers" placeholder="Any partner" value={f.influencerId} onChange={(v) => list.setFilter("influencerId", v)} />
        </FilterBar>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : !data?.items.length ? (
          <ListEmpty list={list} noun="sales" icon={HandCoins} title="No partner sales yet" description="Sales you record with a partner code will appear here." />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
            <Table>
              <thead>
                <tr>
                  <SortableTh column="createdAt" sort={list.sort} onSort={list.toggleSort} firstDir="DESC">Sale</SortableTh>
                  <Th className={HIDE_BELOW.sm}>Partner</Th>
                  <Th className={CUSTOMER_COL}>Customer</Th>
                  <SortableTh column="billAmount" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className={cn(HIDE_BELOW.lg, "text-right")}>Bill</SortableTh>
                  <Th className={cn(HIDE_BELOW.lg, "text-right")}>Discount</Th>
                  <SortableTh column="finalAmount" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className="text-right">Paid</SortableTh>
                  <Th className={HIDE_BELOW.md}>Status</Th>
                  {/* relative keeps the visually hidden label inside the table's scroll box. */}
                  {can("bills.cancel") && <Th className="relative w-10"><span className="sr-only">Actions</span></Th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <div className="font-mono text-xs font-medium whitespace-nowrap">
                        #{s.number}
                        {s.billReference && <span className="font-normal text-muted-foreground">, bill {s.billReference}</span>}
                      </div>
                      <div className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground" title={s.recordedBy ? `Recorded by ${s.recordedBy.name}` : undefined}>
                        {dateTime(s.createdAt)}
                      </div>
                      <div className="mt-0.5 truncate text-sm font-medium sm:hidden">{s.influencer?.name}</div>
                    </Td>
                    <Td className={HIDE_BELOW.sm}>
                      <div className="font-medium whitespace-nowrap">{s.influencer?.name}</div>
                      <div className="max-w-56 truncate text-xs text-muted-foreground" title={`${s.campaign?.name}, ${s.code}`}>
                        {s.campaign?.name}, <span className="font-mono">{s.code}</span>
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-primary">{points(s.pointsAwarded)}</div>
                    </Td>
                    <Td className={CUSTOMER_COL}>
                      {s.customer ? (
                        <>
                          {can("customers.view") ? (
                            <Link href={`/customers/${s.customer.id}`} className="font-medium whitespace-nowrap hover:text-primary">{s.customer.name}</Link>
                          ) : (
                            <div className="font-medium whitespace-nowrap">{s.customer.name}</div>
                          )}
                          <div className="text-xs whitespace-nowrap text-muted-foreground">{mobile(s.customer.mobile)}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className={cn(HIDE_BELOW.lg, "tabular text-right whitespace-nowrap")}>{inr(s.billAmount)}</Td>
                    <Td className={cn(HIDE_BELOW.lg, "tabular text-right whitespace-nowrap text-primary")}>− {inr(s.discountAmount)}</Td>
                    <Td className="tabular text-right font-medium whitespace-nowrap">
                      {inr(s.finalAmount)}
                      <div className="text-xs font-normal text-muted-foreground lg:hidden">of {inr(s.billAmount)}</div>
                      {s.status !== "COMPLETED" && (
                        <div className="mt-1 md:hidden">
                          <StatusBadge status={s.status} />
                        </div>
                      )}
                    </Td>
                    <Td className={HIDE_BELOW.md}>
                      <StatusBadge status={s.status} />
                      {s.cancelReason && <div className="mt-1 max-w-40 truncate text-xs text-muted-foreground" title={s.cancelReason}>{s.cancelReason}</div>}
                    </Td>
                    {can("bills.cancel") && (
                      <Td>
                        {s.status === "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Cancel sale #${s.number}`}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setCancelling(s)}
                          >
                            <Ban className="size-4" />
                          </Button>
                        )}
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPagination list={list} total={data.total} noun="sale" />
          </div>
        )}
      </Card>

      {cancelling && <CancelSaleDialog key={cancelling.id} sale={cancelling} onClose={() => setCancelling(null)} />}
    </>
  );
}

function CancelSaleDialog({ sale, onClose }: { sale: PartnerSale; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const cancel = useMutation({
    mutationFn: () => api.post<PartnerSale>(`/partner-sales/${sale.id}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-sales"] });
      toast.success(`Sale #${sale.number} cancelled; the partner's points were taken back`);
      onClose();
    },
  });

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      title={`Cancel sale #${sale.number}?`}
      description={
        <>
          {sale.influencer?.name} loses the {points(sale.pointsAwarded)} earned on it, and the customer can use this campaign&apos;s offer again.
        </>
      }
      confirmLabel="Cancel sale"
      icon={<Ban className="size-4" />}
      loading={cancel.isPending}
      disabled={reason.trim().length < 3}
      onConfirm={() => cancel.mutate()}
    >
      {cancel.isError && <Alert tone="danger">{errorMessage(cancel.error)}</Alert>}
      <Field label="Reason" required>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer returned the piece" />
      </Field>
    </ConfirmDialog>
  );
}
