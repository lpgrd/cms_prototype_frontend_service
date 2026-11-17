"use client";

import { Wallet } from "lucide-react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DateRangeFilter, dateRangeParams, FilterBar, ListEmpty, ListPagination, SortableTh } from "@/components/list-controls";
import { Alert, Button, Card, ErrorState, Field, HIDE_BELOW, Input, Modal, PageHeader, SecretValue, SelectInput, StatusBadge, Table, TableSkeleton, Td, Th } from "@/components/ui";
import { useListState } from "@/hooks/use-list-state";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { date, inr, number } from "@/lib/format";
import { useCan } from "@/providers/auth";
import type { Paginated, Payout } from "@/lib/types";

type Action = { kind: "pay" | "reject"; payout: Payout } | null;

export default function PayoutsPage() {
  const manage = useCan()("payouts.manage");
  const qc = useQueryClient();
  const [action, setAction] = useState<Action>(null);
  // Opens on the requests waiting for a decision; "All" is one click away.
  const list = useListState({ filters: ["status", "from", "to"] as const, defaults: { status: "REQUESTED" }, sort: { by: "createdAt", dir: "DESC" } });
  const f = list.filters;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["payouts", list.apiParams, f],
    queryFn: () => api.get<Paginated<Payout>>("/payouts", { ...list.apiParams, status: f.status, ...dateRangeParams(f.from, f.to) }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["payouts"] });
    qc.invalidateQueries({ queryKey: ["influencer"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/payouts/${id}/approve`),
    onSuccess: () => (refresh(), toast.success("Payout approved")),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Payouts" description="Partner points converted to cash. Requested → Approved → Paid." />
      <Card padded={false}>
        <FilterBar list={list} placeholder="Partner name or mobile">
          <SelectInput
            className="sm:w-36"
            aria-label="Status"
            value={f.status}
            onValueChange={(v) => list.setFilter("status", v)}
            options={[
              { value: "", label: "All statuses" },
              { value: "REQUESTED", label: "Requested" },
              { value: "APPROVED", label: "Approved" },
              { value: "PAID", label: "Paid" },
              { value: "REJECTED", label: "Rejected" },
            ]}
          />
          <DateRangeFilter from={f.from} to={f.to} onChange={(from, to) => list.setFilters({ from, to })} />
        </FilterBar>
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : !data?.items.length ? (
          <ListEmpty
            list={list}
            noun="payouts"
            icon={Wallet}
            {...(f.status === "REQUESTED"
              ? { title: "No requests waiting", description: "New payout requests from partners appear here for approval." }
              : { title: "No payouts yet", description: "Partners request payouts from their points; requests appear here for approval." })}
          />
        ) : (
          <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isFetching}>
            <Table>
              <thead>
                <tr>
                  <Th>Partner</Th>
                  <SortableTh column="createdAt" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className={HIDE_BELOW.md}>Requested</SortableTh>
                  <SortableTh column="points" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className={cn(HIDE_BELOW.lg, "text-right")}>Points</SortableTh>
                  <Th className={cn(HIDE_BELOW.xl, "text-right")}>Gross</Th>
                  <Th className={cn(HIDE_BELOW.xl, "text-right")}>TDS</Th>
                  <SortableTh column="amount" sort={list.sort} onSort={list.toggleSort} firstDir="DESC" className="text-right">Net payable</SortableTh>
                  <Th className={HIDE_BELOW.lg}>Pay to</Th>
                  <Th className={HIDE_BELOW.sm}>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <Link href={`/partners/${p.influencerId}`} className="font-medium hover:text-primary">{p.influencer?.name}</Link>
                      <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
                        {date(p.createdAt)}, {number(p.points)} pts
                      </div>
                      <div className="mt-1 sm:hidden">
                        <StatusBadge status={p.status} />
                      </div>
                    </Td>
                    <Td className={cn(HIDE_BELOW.md, "text-muted-foreground")}>{date(p.createdAt)}</Td>
                    <Td className={cn(HIDE_BELOW.lg, "tabular text-right")}>{number(p.points)}</Td>
                    <Td className={cn(HIDE_BELOW.xl, "tabular text-right")}>{inr(p.grossAmount)}</Td>
                    <Td className={cn(HIDE_BELOW.xl, "tabular text-right text-muted-foreground")}>{p.tdsAmount ? inr(p.tdsAmount) : "—"}</Td>
                    <Td className="tabular text-right font-medium whitespace-nowrap">
                      {inr(p.amount)}
                      {p.tdsAmount > 0 && <div className="text-xs font-normal text-muted-foreground xl:hidden">after {inr(p.tdsAmount)} TDS</div>}
                    </Td>
                    <Td className={cn(HIDE_BELOW.lg, "text-xs text-muted-foreground")}>
                      {p.influencer?.upiId ? (
                        <SecretValue value={p.influencer.upiId} kind="upi" />
                      ) : p.influencer?.bankAccountNumber ? (
                        <>
                          A/c <SecretValue value={p.influencer.bankAccountNumber} kind="account" />, IFSC {p.influencer.bankIfsc}
                        </>
                      ) : (
                        "Not set"
                      )}
                    </Td>
                    <Td className={HIDE_BELOW.sm}>
                      <StatusBadge status={p.status} />
                      {p.status === "PAID" && <div className="mt-0.5 text-xs text-muted-foreground">{p.paymentReference}</div>}
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                        {manage && p.status === "REQUESTED" && (
                          <Button size="sm" loading={approve.isPending && approve.variables === p.id} onClick={() => approve.mutate(p.id)}>Approve</Button>
                        )}
                        {manage && p.status === "APPROVED" && <Button size="sm" onClick={() => setAction({ kind: "pay", payout: p })}>Mark paid</Button>}
                        {manage && (p.status === "REQUESTED" || p.status === "APPROVED") && (
                          <Button size="sm" variant="danger" onClick={() => setAction({ kind: "reject", payout: p })}>Reject</Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPagination list={list} total={data.total} noun="payout" />
          </div>
        )}
      </Card>
      {action && <ActionDialog action={action} onClose={() => setAction(null)} onDone={refresh} />}
    </>
  );
}

function ActionDialog({ action, onClose, onDone }: { action: NonNullable<Action>; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState("UPI");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const { payout, kind } = action;
  const run = useMutation({
    mutationFn: () =>
      kind === "pay"
        ? api.post(`/payouts/${payout.id}/mark-paid`, { paymentMode: mode, paymentReference: reference })
        : api.post(`/payouts/${payout.id}/reject`, { reason }),
    onSuccess: () => (onDone(), onClose(), toast.success(kind === "pay" ? "Marked as paid" : "Rejected. The points went back to the partner.")),
  });
  const valid = kind === "pay" ? reference.trim().length > 0 : reason.trim().length >= 3;

  return (
    <Modal
      open
      onClose={onClose}
      title={kind === "pay" ? `Pay ${inr(payout.amount)} to ${payout.influencer?.name}` : "Reject payout"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={kind === "pay" ? "primary" : "destructive"} loading={run.isPending} disabled={!valid} onClick={() => run.mutate()}>
            {kind === "pay" ? "Confirm payment" : "Reject payout"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {run.isError && <Alert tone="danger">{errorMessage(run.error)}</Alert>}
        {kind === "pay" ? (
          <>
            <Field label="Paid via" required>
              <SelectInput
                value={mode}
                onValueChange={setMode}
                options={[
                  { value: "UPI", label: "UPI" },
                  { value: "BANK_TRANSFER", label: "Bank transfer" },
                  { value: "CASH", label: "Cash" },
                  { value: "CHEQUE", label: "Cheque" },
                ]}
              />
            </Field>
            <Field label="Reference" required hint="UTR / transaction ID / cheque number"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
          </>
        ) : (
          <Field label="Reason" required hint="The partner will see this. Their points are returned.">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}
      </div>
    </Modal>
  );
}
