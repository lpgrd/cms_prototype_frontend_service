"use client";

import { History, Wallet } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useState } from "react";
import { Empty, ErrorState, HIDE_BELOW, StatusBadge, Table, TableSkeleton, Td, Th } from "@/components/ui";
import { Pagination } from "@/components/list-controls";
import { api } from "@/lib/api";
import { date, dateTime, inr, number } from "@/lib/format";
import type { LedgerEntry, LedgerType, Paginated, Payout } from "@/lib/types";

const LEDGER_LABELS: Record<LedgerType, string> = {
  EARN: "Earned",
  EARN_REVERSAL: "Bill cancelled",
  PAYOUT: "Payout",
  PAYOUT_REVERSAL: "Payout returned",
  ADJUSTMENT: "Adjustment",
};

/** Paginated points ledger; `endpoint` is either the owner or the self-service ledger route. */
export function LedgerTable({ endpoint }: { endpoint: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ledger", endpoint, page],
    queryFn: () => api.get<Paginated<LedgerEntry>>(endpoint, { page, limit: 15 }),
    placeholderData: keepPreviousData,
  });
  if (isLoading) return <TableSkeleton />;
  if (error || !data) return <div className="p-4"><ErrorState error={error} /></div>;
  if (!data.items.length) return <Empty icon={History} title="No points activity yet" />;

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th className={HIDE_BELOW.sm}>Date</Th>
            <Th>Activity</Th>
            <Th className="text-right">Points</Th>
            <Th className={clsx(HIDE_BELOW.sm, "text-right")}>Balance</Th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((e) => (
            <tr key={e.id}>
              <Td className={clsx(HIDE_BELOW.sm, "whitespace-nowrap text-muted-foreground")}>{dateTime(e.createdAt)}</Td>
              <Td>
                <div className="font-medium">{LEDGER_LABELS[e.type]}</div>
                {e.note && <div className="text-xs text-muted-foreground">{e.note}</div>}
                <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                  {dateTime(e.createdAt)}, balance {number(e.balanceAfter)}
                </div>
              </Td>
              <Td className={clsx("tabular text-right font-medium", e.points >= 0 ? "text-primary" : "text-destructive")}>
                {e.points >= 0 ? "+" : "−"}
                {number(Math.abs(e.points))}
              </Td>
              <Td className={clsx(HIDE_BELOW.sm, "tabular text-right")}>{number(e.balanceAfter)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={page} limit={data.limit} total={data.total} onChange={setPage} />
    </>
  );
}

export function PayoutsTable({ payouts, actions }: { payouts: Payout[]; actions?: (p: Payout) => React.ReactNode }) {
  if (!payouts.length) return <Empty icon={Wallet} title="No payouts yet" />;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Requested</Th>
          <Th className={clsx(HIDE_BELOW.sm, "text-right")}>Points</Th>
          <Th className={clsx(HIDE_BELOW.lg, "text-right")}>Gross</Th>
          <Th className={clsx(HIDE_BELOW.lg, "text-right")}>TDS</Th>
          <Th className="text-right">Net paid</Th>
          <Th>Status</Th>
          <Th className={HIDE_BELOW.md}>Details</Th>
          {actions && <Th />}
        </tr>
      </thead>
      <tbody>
        {payouts.map((p) => (
          <tr key={p.id}>
            <Td className="whitespace-nowrap text-muted-foreground">
              {date(p.createdAt)}
              <div className="mt-0.5 text-xs sm:hidden">{number(p.points)} pts</div>
            </Td>
            <Td className={clsx(HIDE_BELOW.sm, "tabular text-right")}>{number(p.points)}</Td>
            <Td className={clsx(HIDE_BELOW.lg, "tabular text-right")}>{inr(p.grossAmount)}</Td>
            <Td className={clsx(HIDE_BELOW.lg, "tabular text-right text-muted-foreground")}>{p.tdsAmount ? `${inr(p.tdsAmount)} (${p.tdsRate}%)` : "—"}</Td>
            <Td className="tabular text-right font-medium whitespace-nowrap">
              {inr(p.amount)}
              {p.tdsAmount > 0 && <div className="text-xs font-normal text-muted-foreground lg:hidden">after {inr(p.tdsAmount)} TDS</div>}
            </Td>
            <Td>
              <StatusBadge status={p.status} />
              {p.status === "REJECTED" && p.rejectionReason && <div className="mt-1 max-w-48 text-xs text-muted-foreground md:hidden">{p.rejectionReason}</div>}
            </Td>
            <Td className={clsx(HIDE_BELOW.md, "text-xs text-muted-foreground")}>
              {p.status === "PAID" && `Paid by ${p.paymentMode?.replace("_", " ")} on ${date(p.paidAt)}, ref ${p.paymentReference}`}
              {p.status === "REJECTED" && p.rejectionReason}
              {p.notes && <div>{p.notes}</div>}
            </Td>
            {actions && <Td className="text-right">{actions(p)}</Td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
