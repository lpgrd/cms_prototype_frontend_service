"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgePercent, Cake, CalendarClock, CreditCard, Download, Gem, HandCoins, Heart, IdCard, IndianRupee, MailCheck, Receipt, ReceiptText, ShoppingBag, XCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card, Checkbox, DefinitionList, Empty, ErrorState, HIDE_BELOW, PageHeader, SecretValue, Spinner, Stat, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Pagination } from "@/components/list-controls";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { date, dateTime, grams, inr, inrShort, mobile, paymentLabel, plural, sourceLabel, titleCase } from "@/lib/format";
import { FULL_BILLING } from "@/lib/features";
import type { Customer, Customer360, Paginated, PartnerSale, Transaction } from "@/lib/types";
import { useCan } from "@/providers/auth";
import { CustomerFormButton } from "../customer-form";
import { ContactsCard } from "./contacts-card";

export function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.get<Customer360>(`/customers/${id}`),
  });

  if (isLoading) return <Spinner />;
  if (error || !data) {
    return (
      <>
        <PageHeader backHref="/customers" title={"Couldn't load this page"} />
        <ErrorState error={error} />
      </>
    );
  }
  const { customer: c, stats, redemptions } = data;

  return (
    <>
      <PageHeader
        backHref="/customers"
        title={c.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {mobile(c.mobile)}
            {c.acquiredViaInfluencer ? (
              <Badge tone="gold">
                Came via{" "}
                <Link href={`/partners/${c.acquiredViaInfluencer.id}`} className="ml-1 underline">
                  {c.acquiredViaInfluencer.name}
                </Link>
              </Badge>
            ) : (
              <Badge>{sourceLabel(c.source)}</Badge>
            )}
            {c.tags.map((t) => (
              <Badge key={t} tone="info">{t}</Badge>
            ))}
          </span>
        }
        actions={
          <>
            {can("customers.export") && (
              <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => window.open(`/api/customers/${c.id}/export`, "_blank")}>
                Export data
              </Button>
            )}
            {can("customers.edit") && <CustomerFormButton customer={c} />}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={IndianRupee} label="Lifetime spend" value={inrShort(stats.totalSpend)} accent />
        <Stat icon={ShoppingBag} label="Purchases" value={stats.purchaseCount} />
        <Stat icon={ReceiptText} label="Average bill" value={inrShort(stats.averageBill)} />
        <Stat icon={CalendarClock} label="Last purchase" value={date(stats.lastPurchaseAt)} sub={stats.firstPurchaseAt ? `Customer since ${date(stats.firstPurchaseAt)}` : undefined} />
        {FULL_BILLING && <Stat icon={Gem} label="Pieces bought" value={stats.piecesBought} />}
        <Stat icon={BadgePercent} label="Offer discounts received" value={inrShort(stats.discountReceived)} sub={plural(redemptions.filter((r) => r.status === "ACTIVE").length, "offer") + " used"} />
        {FULL_BILLING && <Stat icon={CreditCard} label="Usually pays by" value={paymentLabel(stats.usualPaymentMode)} />}
        {FULL_BILLING && <Stat icon={XCircle} label="Cancelled bills" value={stats.cancelledBills} />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!can("bills.view") ? (
            <Card title={FULL_BILLING ? "Bills" : "Sales"} icon={Receipt}>
              <p className="text-sm text-muted-foreground">Your role can&apos;t view {FULL_BILLING ? "bills" : "sales"}.</p>
            </Card>
          ) : FULL_BILLING ? (
            <CustomerBills customerId={c.id} />
          ) : (
            <CustomerSales customerId={c.id} />
          )}

          <Card title="Offers used" icon={BadgePercent} padded={false}>
            {redemptions.length === 0 ? (
              <Empty icon={BadgePercent} title="No partner offers used" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Campaign</Th>
                    <Th className={HIDE_BELOW.sm}>Partner</Th>
                    <Th className="text-right">Discount</Th>
                    <Th className={HIDE_BELOW.md}>Date</Th>
                    <Th className={HIDE_BELOW.sm}>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr key={r.id}>
                      <Td>
                        <Link href={`/campaigns/${r.campaignId}`} className="hover:text-primary">{r.campaign.name}</Link>
                        <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                          {r.influencer.name}, {date(r.createdAt)}
                        </div>
                      </Td>
                      <Td className={HIDE_BELOW.sm}><Link href={`/partners/${r.influencerId}`} className="hover:text-primary">{r.influencer.name}</Link></Td>
                      <Td className="tabular text-right whitespace-nowrap">
                        {inr(r.discountAmount)}
                        {r.status !== "ACTIVE" && (
                          <div className="mt-1 sm:hidden">
                            <StatusBadge status={r.status} />
                          </div>
                        )}
                      </Td>
                      <Td className={cn(HIDE_BELOW.md, "whitespace-nowrap text-muted-foreground")}>{date(r.createdAt)}</Td>
                      <Td className={HIDE_BELOW.sm}><StatusBadge status={r.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <ContactsCard customerId={c.id} contacts={data.contacts} editable={can("customers.edit")} />
          <ConsentCard customer={c} history={data.consentHistory} />

          <Card title="Profile" icon={IdCard}>
            <DefinitionList
              items={[
                ["Gender", c.gender ? titleCase(c.gender) : null],
                ["City", [c.city, c.pincode].filter(Boolean).join(" ") || null],
                ["PAN", c.panNumber && <SecretValue value={c.panNumber} kind="pan" />],
                ["Added", date(c.createdAt)],
              ]}
            />
            {(c.dateOfBirth || c.anniversaryDate) && (
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                {c.dateOfBirth && (
                  <div className="flex items-center gap-2"><Cake className="size-4 text-primary" /> Birthday {date(c.dateOfBirth)}</div>
                )}
                {c.anniversaryDate && (
                  <div className="flex items-center gap-2"><Heart className="size-4 text-primary" /> Anniversary {date(c.anniversaryDate)}</div>
                )}
              </div>
            )}
            {c.address && <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm text-muted-foreground">{c.address}</p>}
            {c.notes && <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm text-muted-foreground">{c.notes}</p>}
          </Card>

          <Card title="What they buy" icon={Gem}>
            {stats.metalMix.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {stats.metalMix.map((m) => (
                  <li key={m.metalType} className="flex justify-between">
                    <span>
                      {titleCase(m.metalType)} <span className="text-muted-foreground">{plural(m.pieces, "piece")}, {grams(m.netWeight)}</span>
                    </span>
                    <span className="tabular font-medium">{inrShort(m.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

const SOURCE_LABEL = { BILLING: "at billing", CRM: "by staff", CUSTOMER_REQUEST: "on customer request" } as const;

/** Marketing consent (DPDP Act): current state, a toggle that records who/when, and the history. */
function ConsentCard({ customer, history }: { customer: Customer; history: Customer360["consentHistory"] }) {
  const qc = useQueryClient();
  const can = useCan();
  const update = useMutation({
    mutationFn: (granted: boolean) =>
      api.post(`/customers/${customer.id}/consent`, { granted, source: granted ? "CRM" : "CUSTOMER_REQUEST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer", customer.id] });
      toast.success("Consent updated");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card
      title="Marketing consent" icon={MailCheck}
      actions={customer.marketingConsent ? <Badge tone="success">Opted in</Badge> : <Badge>Not opted in</Badge>}
    >
      <Checkbox
        label="Customer agrees to receive offers and updates"
        checked={customer.marketingConsent}
        disabled={update.isPending || !can("customers.edit")}
        onCheckedChange={(v) => update.mutate(v)}
      />
      {history.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          {history.slice(0, 5).map((e) => (
            <li key={e.id}>
              {e.granted ? "Opted in" : "Opted out"} {SOURCE_LABEL[e.source]} on {dateTime(e.createdAt)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const BILLS_PER_PAGE = 10;

/** The customer's partner sales, newest first, paged through the sales API (which enforces bills.view). */
function CustomerSales({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ["partner-sales", { customerId, page }],
    queryFn: () => api.get<Paginated<PartnerSale>>("/partner-sales", { customerId, page, limit: BILLS_PER_PAGE }),
    placeholderData: keepPreviousData,
  });

  return (
    <Card title={data ? `Sales (${data.total})` : "Sales"} icon={HandCoins} padded={false}>
      {isLoading ? (
        <Spinner />
      ) : error || !data ? (
        <div className="p-4">
          <ErrorState error={error} />
        </div>
      ) : data.items.length === 0 ? (
        <Empty icon={ShoppingBag} title="No purchases yet" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Sale</Th>
                <Th className={HIDE_BELOW.sm}>Date</Th>
                <Th className={HIDE_BELOW.md}>Partner</Th>
                <Th className="text-right">Paid</Th>
                <Th className={HIDE_BELOW.sm}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <div className="font-mono text-xs whitespace-nowrap">#{s.number}</div>
                    {s.billReference && <div className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground">Bill {s.billReference}</div>}
                    <div className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground sm:hidden">{date(s.createdAt)}</div>
                  </Td>
                  <Td className={cn(HIDE_BELOW.sm, "whitespace-nowrap text-muted-foreground")}>{date(s.createdAt)}</Td>
                  <Td className={HIDE_BELOW.md}><Badge tone="gold">{s.influencer?.name ?? s.code}</Badge></Td>
                  <Td className="tabular text-right font-medium whitespace-nowrap">
                    {inr(s.finalAmount)}
                    <div className="text-xs font-normal text-muted-foreground">of {inr(s.billAmount)}</div>
                  </Td>
                  <Td className={HIDE_BELOW.sm}><StatusBadge status={s.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} limit={BILLS_PER_PAGE} total={data.total} onChange={setPage} noun="sale" />
        </>
      )}
    </Card>
  );
}

/** Every bill of the customer, newest first, paged through the bills API (which enforces bills.view). */
function CustomerBills({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", { customerId, page }],
    queryFn: () => api.get<Paginated<Transaction>>("/transactions", { customerId, page, limit: BILLS_PER_PAGE }),
    placeholderData: keepPreviousData,
  });

  return (
    <Card title={data ? `Bills (${data.total})` : "Bills"} icon={Receipt} padded={false}>
      {isLoading ? (
        <Spinner />
      ) : error || !data ? (
        <div className="p-4">
          <ErrorState error={error} />
        </div>
      ) : data.items.length === 0 ? (
        <Empty icon={ShoppingBag} title="No purchases yet" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th className={HIDE_BELOW.sm}>Date</Th>
                <Th className={HIDE_BELOW.md}>Offer</Th>
                <Th className={HIDE_BELOW.xl}>Paid by</Th>
                <Th className="text-right">Total</Th>
                <Th className={HIDE_BELOW.sm}>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <Td>
                    <Link href={`/transactions/${t.id}`} className="whitespace-nowrap font-mono text-xs hover:text-primary">{t.invoiceNumber}</Link>
                    <div className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground sm:hidden">{date(t.createdAt)}</div>
                  </Td>
                  <Td className={cn(HIDE_BELOW.sm, "whitespace-nowrap text-muted-foreground")}>{date(t.createdAt)}</Td>
                  <Td className={HIDE_BELOW.md}>{t.appliedCode ? <Badge tone="gold">{t.campaignInfluencer?.influencer?.name ?? t.appliedCode}</Badge> : <span className="text-muted-foreground">—</span>}</Td>
                  <Td className={cn(HIDE_BELOW.xl, "whitespace-nowrap text-muted-foreground")}>{paymentLabel(t.paymentMode)}</Td>
                  <Td className="tabular text-right font-medium whitespace-nowrap">
                    {inr(t.grandTotal)}
                    {t.status !== "COMPLETED" && (
                      <div className="mt-1 sm:hidden">
                        <StatusBadge status={t.status} />
                      </div>
                    )}
                  </Td>
                  <Td className={HIDE_BELOW.sm}><StatusBadge status={t.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} limit={BILLS_PER_PAGE} total={data.total} onChange={setPage} noun="bill" />
        </>
      )}
    </Card>
  );
}
