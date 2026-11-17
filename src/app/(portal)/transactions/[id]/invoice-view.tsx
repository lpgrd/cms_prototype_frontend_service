"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, FileDown, Printer, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, Button, Card, ConfirmDialog, ErrorState, Field, HIDE_BELOW, PageHeader, PageSkeleton, StatusBadge, Table, Td, Textarea, Th } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { dateTime, grams, inr, mobile, paymentLabel, paymentLines, points } from "@/lib/format";
import type { Settings, Transaction } from "@/lib/types";
import { useCan } from "@/providers/auth";

export function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const can = useCan();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: tx, isLoading, error } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => api.get<Transaction>(`/transactions/${id}`),
  });
  const { data: store } = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/settings") });

  const cancel = useMutation({
    mutationFn: () => api.post<Transaction>(`/transactions/${id}/cancel`, { reason }),
    onSuccess: (updated) => {
      qc.setQueryData(["transaction", id], updated);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setCancelOpen(false);
      toast.success("Bill cancelled; discount usage and partner points were reversed");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading) return <PageSkeleton kind="detail" />;
  if (error || !tx) {
    return (
      <>
        <PageHeader backHref="/transactions" title={"Couldn't load this bill"} />
        <ErrorState error={error} />
      </>
    );
  }
  const ci = tx.campaignInfluencer;

  return (
    <>
      {/* The invoice card below is the printable document, so the page header is screen-only. */}
      <PageHeader
        className="no-print"
        backHref="/transactions"
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{tx.invoiceNumber}</span>
            <StatusBadge status={tx.status} />
          </span>
        }
        description={`Billed to ${tx.customer?.name ?? "a customer"} on ${dateTime(tx.createdAt)} for ${inr(tx.grandTotal)}`}
        actions={
          <>
            {can("bills.cancel") && tx.status === "COMPLETED" && (
              <Button variant="danger" icon={<Ban className="size-4" />} onClick={() => setCancelOpen(true)}>
                Cancel bill
              </Button>
            )}
            <Button variant="secondary" icon={<FileDown className="size-4" />} onClick={() => window.open(`/api/transactions/${tx.id}/pdf`, "_blank")}>
              PDF
            </Button>
            <Button variant="secondary" icon={<ReceiptText className="size-4" />} onClick={() => window.open(`/receipt/${tx.id}`, "_blank")}>
              Receipt (80mm)
            </Button>
            <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />

      {tx.status === "CANCELLED" && (
        <div className="no-print mb-4">
          <Alert tone="danger">
            Cancelled on {dateTime(tx.cancelledAt)}. Reason: {tx.cancelReason}
          </Alert>
        </div>
      )}

      <Card className="max-w-4xl">
        <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 sm:flex-row">
          <div>
            <div className="font-heading text-3xl font-semibold">{store?.storeName ?? "Tax invoice"}</div>
            {store?.storeAddress && <div className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{store.storeAddress}</div>}
            <div className="mt-1 text-xs text-muted-foreground">
              {store?.storePhone && <div>Phone {store.storePhone}</div>}
              {store?.gstin && <div>GSTIN {store.gstin}</div>}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs text-muted-foreground">Tax invoice</div>
            <div className="font-mono text-lg font-semibold">{tx.invoiceNumber}</div>
            <div className="text-sm text-muted-foreground">{dateTime(tx.createdAt)}</div>
            <div className="mt-1"><StatusBadge status={tx.status} /></div>
          </div>
        </div>

        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Billed to</div>
            <Link href={`/customers/${tx.customerId}`} className="mt-1 block font-medium hover:text-primary">
              {tx.customer?.name}
            </Link>
            <div className="text-sm text-muted-foreground">{mobile(tx.customer?.mobile)}</div>
            {tx.customerPan && <div className="text-sm text-muted-foreground">PAN {tx.customerPan}</div>}
          </div>
          {ci && (
            <div className="sm:text-right">
              <div className="text-xs text-muted-foreground">Offer applied</div>
              <div className="mt-1 font-medium">{ci.campaign?.name}</div>
              <div className="text-sm text-muted-foreground">
                via {ci.influencer?.name}, code <span className="font-mono">{tx.appliedCode}</span>
              </div>
            </div>
          )}
        </div>

        <div className="-mx-5">
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th className={cn(HIDE_BELOW.sm, "text-right")}>Net wt</Th>
                <Th className={cn(HIDE_BELOW.md, "text-right")}>Rate/g</Th>
                <Th className={cn(HIDE_BELOW.md, "text-right")}>Metal</Th>
                <Th className={cn(HIDE_BELOW.md, "text-right")}>Making</Th>
                <Th className={cn(HIDE_BELOW.lg, "text-right")}>Stones/other</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody className="tabular">
              {tx.items?.map((i) => (
                <tr key={i.id}>
                  <Td>
                    <div className="font-medium">{i.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.metalType.charAt(0) + i.metalType.slice(1).toLowerCase()} {i.purity}, gross {grams(i.grossWeight)}
                      {i.huid && <>, HUID <span className="font-mono">{i.huid}</span></>}
                    </div>
                    {/* The breakdown the hidden columns show on wider screens. */}
                    <div className="mt-1 text-xs text-muted-foreground md:hidden">
                      {grams(i.netWeight)} at {inr(i.ratePerGram)}/g = {inr(i.metalValue)}, making {inr(i.makingCharges)}
                      {i.stoneCharges + i.otherCharges > 0 && `, stones/other ${inr(i.stoneCharges + i.otherCharges)}`}
                    </div>
                  </Td>
                  <Td className={cn(HIDE_BELOW.sm, "text-right whitespace-nowrap")}>{grams(i.netWeight)}</Td>
                  <Td className={cn(HIDE_BELOW.md, "text-right")}>{inr(i.ratePerGram)}</Td>
                  <Td className={cn(HIDE_BELOW.md, "text-right")}>{inr(i.metalValue)}</Td>
                  <Td className={cn(HIDE_BELOW.md, "text-right")}>{inr(i.makingCharges)}</Td>
                  <Td className={cn(HIDE_BELOW.lg, "text-right")}>{inr(i.stoneCharges + i.otherCharges)}</Td>
                  <Td className="text-right font-medium whitespace-nowrap">{inr(i.lineTotal)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="tabular w-full max-w-xs space-y-1.5 text-sm">
            <Line label="Subtotal" value={inr(tx.subtotal)} />
            {tx.discountAmount > 0 && <Line label="Offer discount" value={`− ${inr(tx.discountAmount)}`} />}
            <Line label="Taxable amount" value={inr(tx.taxableAmount)} />
            <Line label={`CGST (${tx.taxRate / 2}%)`} value={inr(tx.taxAmount / 2)} />
            <Line label={`SGST (${tx.taxRate / 2}%)`} value={inr(tx.taxAmount / 2)} />
            {tx.roundOff !== 0 && <Line label="Round off" value={inr(tx.roundOff)} />}
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{inr(tx.grandTotal)}</dd>
            </div>
            {paymentLines(tx).map((p, i) => (
              <div key={i} className="flex justify-between gap-3 text-xs text-muted-foreground">
                <dt>
                  {i === 0 ? "Paid by " : ""}
                  {paymentLabel(p.method)}
                  {p.reference && <span className="font-mono"> ({p.reference})</span>}
                </dt>
                <dd className="tabular">{inr(p.amount)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="no-print mt-6 flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Billed by {tx.billedBy?.name ?? "—"}</span>
          {tx.pointsAwarded > 0 && ci && (
            <span>
              {ci.influencer?.name} earned {points(tx.pointsAwarded)}
            </span>
          )}
        </div>
        {tx.notes && <p className="mt-3 text-sm text-muted-foreground">Note: {tx.notes}</p>}
      </Card>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this bill?"
        description={
          <>
            This marks <span className="font-mono text-foreground">{tx.invoiceNumber}</span> as cancelled and removes it from the customer&apos;s history.
            {ci && " The customer can use an offer from this campaign again, and the partner's points are taken back."}
          </>
        }
        confirmLabel="Cancel bill"
        icon={<Ban className="size-4" />}
        loading={cancel.isPending}
        disabled={reason.trim().length < 3}
        onConfirm={() => cancel.mutate()}
      >
        {cancel.isError && <Alert tone="danger">{errorMessage(cancel.error)}</Alert>}
        <Field label="Reason" required hint="Kept on the bill for the audit trail.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item returned" />
        </Field>
      </ConfirmDialog>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
